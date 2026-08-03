import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PresenceService } from './presence.service';
import { PrismaService } from '../prisma/prisma.service';
import * as Y from 'yjs';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Cache of active Yjs documents in memory
  private boardDocs: Map<string, Y.Doc> = new Map();
  // Throttle timer map for db database commits
  private saveDebouncers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly prisma: PrismaService
  ) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.query.token as string;
    
    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'aether_super_secret_jwt_key_12345');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      socket.data.userId = payload.sub;
    } catch (e) {
      socket.disconnect();
    }
  }

  async handleGatewayDisconnect(socket: Socket) {
    const boardId = socket.data.boardId;
    if (boardId) {
      await this.presenceService.removeUser(boardId, socket.id);
      
      // Broadcast updated presence to remaining users
      const presenceList = await this.presenceService.getBoardPresence(boardId);
      this.server.to(`board:${boardId}`).emit('presence-update', presenceList);

      // Check if board room is empty to purge cache
      const room = this.server.sockets.adapter.rooms.get(`board:${boardId}`);
      if (!room || room.size === 0) {
        // Force final save before cache deletion
        this.saveBoardImmediately(boardId);
      }
    }
  }

  // Fallback for interface signatures
  async handleDisconnect(socket: Socket) {
    await this.handleGatewayDisconnect(socket);
  }

  @SubscribeMessage('join-board')
  async handleJoinBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody('boardId') boardId: string
  ) {
    const userId = socket.data.userId;
    if (!userId || !boardId) return;

    socket.data.boardId = boardId;
    socket.join(`board:${boardId}`);

    // Register presence
    await this.presenceService.registerUser(boardId, socket.id, userId);

    // Broadcast presence
    const presenceList = await this.presenceService.getBoardPresence(boardId);
    this.server.to(`board:${boardId}`).emit('presence-update', presenceList);

    // Initialize or get Yjs Document
    await this.getOrLoadBoardDoc(boardId);
  }

  // ----------------------------------------------------
  // YJS Sync & Binary Streaming Protocol Event Handlers
  // ----------------------------------------------------

  @SubscribeMessage('yjs-sync-step-1')
  async handleYjsSyncStep1(
    @ConnectedSocket() socket: Socket,
    @MessageBody() clientStateVector: Buffer
  ) {
    const boardId = socket.data.boardId;
    if (!boardId) return;

    const doc = await this.getOrLoadBoardDoc(boardId);

    // Step 2: Compute delta updates missing on client and reply
    const update = Y.encodeStateAsUpdate(doc, new Uint8Array(clientStateVector));
    socket.emit('yjs-sync-step-2', Buffer.from(update));

    // Send server state vector so client can compute what server is missing
    const serverStateVector = Y.encodeStateVector(doc);
    socket.emit('yjs-sync-step-1', Buffer.from(serverStateVector));
  }

  @SubscribeMessage('yjs-update')
  async handleYjsUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() updatePayload: Buffer
  ) {
    const boardId = socket.data.boardId;
    if (!boardId) return;

    const doc = await this.getOrLoadBoardDoc(boardId);

    // Apply client update to server document state vector
    try {
      Y.applyUpdate(doc, new Uint8Array(updatePayload));
    } catch (e) {
      console.error(`[Yjs Sync] Failed to apply update on board ${boardId}:`, e);
      return;
    }

    // Broadcast binary update payload to other clients in same board room
    socket.to(`board:${boardId}`).emit('yjs-update', updatePayload);

    // Schedule throttled save
    this.scheduleBoardSave(boardId);
  }

  // ----------------------------------------------------
  // Live cursor / selection / typing updates
  // ----------------------------------------------------

  @SubscribeMessage('cursor-move')
  async handleCursorMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() coords: { x: number; y: number }
  ) {
    const boardId = socket.data.boardId;
    if (!boardId) return;

    await this.presenceService.updateCursor(boardId, socket.id, coords.x, coords.y);
    
    socket.to(`board:${boardId}`).emit('cursor-update', {
      socketId: socket.id,
      userId: socket.data.userId,
      x: coords.x,
      y: coords.y,
    });
  }

  @SubscribeMessage('typing-change')
  async handleTypingChange(
    @ConnectedSocket() socket: Socket,
    @MessageBody('isTyping') isTyping: boolean
  ) {
    const boardId = socket.data.boardId;
    if (!boardId) return;

    await this.presenceService.updateTyping(boardId, socket.id, isTyping);
    
    const presenceList = await this.presenceService.getBoardPresence(boardId);
    this.server.to(`board:${boardId}`).emit('presence-update', presenceList);
  }

  @SubscribeMessage('selection-change')
  async handleSelectionChange(
    @ConnectedSocket() socket: Socket,
    @MessageBody('nodeId') nodeId?: string
  ) {
    const boardId = socket.data.boardId;
    if (!boardId) return;

    await this.presenceService.updateSelection(boardId, socket.id, nodeId);

    socket.to(`board:${boardId}`).emit('selection-update', {
      socketId: socket.id,
      nodeId,
    });
  }

  // ----------------------------------------------------
  // Helper Methods for Document Caching and Persistence
  // ----------------------------------------------------

  private async getOrLoadBoardDoc(boardId: string): Promise<Y.Doc> {
    let doc = this.boardDocs.get(boardId);

    if (!doc) {
      doc = new Y.Doc();
      
      // Load serialized updates from prisma database
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: boardId },
        select: { canvasData: true }
      });

      if (workspace?.canvasData) {
        try {
          const binary = Buffer.from(workspace.canvasData, 'base64');
          Y.applyUpdate(doc, new Uint8Array(binary));
        } catch (e) {
          console.error(`[Yjs Service] Failed to parse canvasData for board ${boardId}:`, e);
        }
      }

      this.boardDocs.set(boardId, doc);
    }

    return doc;
  }

  private scheduleBoardSave(boardId: string) {
    // Clear existing timer if active
    const existing = this.saveDebouncers.get(boardId);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new debounce commit timer (2 seconds)
    const timeout = setTimeout(async () => {
      await this.saveBoardImmediately(boardId);
    }, 2000);

    this.saveDebouncers.set(boardId, timeout);
  }

  private async saveBoardImmediately(boardId: string) {
    // Clear references from debouncer registry
    const debouncer = this.saveDebouncers.get(boardId);
    if (debouncer) {
      clearTimeout(debouncer);
      this.saveDebouncers.delete(boardId);
    }

    const doc = this.boardDocs.get(boardId);
    if (!doc) return;

    const binary = Y.encodeStateAsUpdate(doc);
    const base64 = Buffer.from(binary).toString('base64');

    try {
      await this.prisma.workspace.update({
        where: { id: boardId },
        data: { canvasData: base64 }
      });
    } catch (e) {
      console.error(`[Yjs Sync] Error updating canvasData for board ${boardId} in DB:`, e);
    }

    // If there are no users left in room, clear memory cache completely
    const room = this.server.sockets.adapter.rooms.get(`board:${boardId}`);
    if (!room || room.size === 0) {
      this.boardDocs.delete(boardId);
    }
  }

  // ----------------------------------------------------
  // Task 3 & 4: Snapshotting, Restoration, and Event Sourcing
  // ----------------------------------------------------

  async getActiveCanvasData(boardId: string): Promise<string | null> {
    const doc = await this.getOrLoadBoardDoc(boardId);
    const binary = Y.encodeStateAsUpdate(doc);
    return Buffer.from(binary).toString('base64');
  }

  async recordEvent(boardId: string, eventType: string, payload: any, userId?: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const lastEvent = await tx.canvasEvent.findFirst({
          where: { workspaceId: boardId },
          orderBy: { sequence: 'desc' },
        });
        const sequence = lastEvent ? lastEvent.sequence + 1 : 1;

        await tx.canvasEvent.create({
          data: {
            workspaceId: boardId,
            eventType,
            payload: payload || {},
            userId: userId || null,
            sequence,
          },
        });
      });
    } catch (e) {
      console.error(`[Yjs Sync] Error recording event ${eventType} for board ${boardId}:`, e);
    }
  }

  async restoreBoardState(boardId: string, base64Data: string): Promise<void> {
    const binary = Buffer.from(base64Data, 'base64');
    let doc = this.boardDocs.get(boardId);

    if (!doc) {
      doc = new Y.Doc();
      this.boardDocs.set(boardId, doc);
    }

    doc.transact(() => {
      const nodesMap = doc.getMap('nodes');
      const edgesMap = doc.getMap('edges');
      nodesMap.clear();
      edgesMap.clear();
      Y.applyUpdate(doc, new Uint8Array(binary));
    });

    // Save to database immediately
    await this.prisma.workspace.update({
      where: { id: boardId },
      data: { canvasData: base64Data },
    });

    // Broadcast new update to all users in the board room
    const fullUpdate = Y.encodeStateAsUpdate(doc);
    this.server.to(`board:${boardId}`).emit('yjs-update', Buffer.from(fullUpdate));
  }

  @SubscribeMessage('canvas-event')
  async handleCanvasEvent(
    @ConnectedSocket() socket: Socket,
    @MessageBody() eventData: { eventType: string; payload: any }
  ) {
    const boardId = socket.data.boardId;
    const userId = socket.data.userId;
    if (!boardId) return;

    await this.recordEvent(boardId, eventData.eventType, eventData.payload, userId);

    // Broadcast the event to all other clients in same board room
    socket.to(`board:${boardId}`).emit('canvas-event', {
      eventType: eventData.eventType,
      payload: eventData.payload,
      userId,
      createdAt: new Date().toISOString(),
    });
  }

  sendNotificationToUser(userId: string, notification: any) {
    if (!this.server) return;
    this.server.sockets.sockets.forEach((socket) => {
      if (socket.data.userId === userId) {
        socket.emit('notification', notification);
      }
    });
  }
}
