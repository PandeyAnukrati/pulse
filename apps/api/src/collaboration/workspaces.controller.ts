import { Controller, Get, Post, Body, Param, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationGateway } from './collaboration.gateway';
import * as Y from 'yjs';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationGateway: CollaborationGateway
  ) {}

  @Get(':boardId/events')
  async getEvents(@Param('boardId') boardId: string) {
    return this.prisma.canvasEvent.findMany({
      where: { workspaceId: boardId },
      orderBy: { sequence: 'asc' },
    });
  }

  @Get(':boardId/versions')
  async getVersions(@Param('boardId') boardId: string) {
    return this.prisma.workspaceVersion.findMany({
      where: { workspaceId: boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  @Post(':boardId/versions')
  async createVersion(
    @Req() req: any,
    @Param('boardId') boardId: string,
    @Body('name') name: string,
    @Body('snapshotState') snapshotState?: any
  ) {
    const userId = req.user.id;

    // Find workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: boardId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Get current Y.Doc binary from gateway or DB
    const canvasData = await this.collaborationGateway.getActiveCanvasData(boardId);

    // Save version
    const version = await this.prisma.workspaceVersion.create({
      data: {
        workspaceId: boardId,
        name: name || `Snapshot - ${new Date().toLocaleString()}`,
        canvasData: canvasData || '',
        createdById: userId,
      },
    });

    // Also record an event for this snapshot in event sourcing
    await this.collaborationGateway.recordEvent(boardId, 'CREATE_SNAPSHOT', {
      versionId: version.id,
      name: version.name,
      snapshotState,
    }, userId);

    return version;
  }

  @Post(':boardId/versions/:versionId/restore')
  async restoreVersion(
    @Req() req: any,
    @Param('boardId') boardId: string,
    @Param('versionId') versionId: string
  ) {
    const userId = req.user.id;

    // Fetch target version
    const version = await this.prisma.workspaceVersion.findFirst({
      where: { id: versionId, workspaceId: boardId },
    });
    if (!version) {
      throw new NotFoundException('Version not found in this workspace');
    }

    // Restore state using collaboration gateway
    await this.collaborationGateway.restoreBoardState(boardId, version.canvasData);

    // Decode Yjs state to capture the snapshot state for event sourcing log
    let snapshotState = { nodes: [], edges: [] } as any;
    try {
      const doc = new Y.Doc();
      const binary = Buffer.from(version.canvasData, 'base64');
      Y.applyUpdate(doc, new Uint8Array(binary));
      const nodesMap = doc.getMap('nodes');
      const edgesMap = doc.getMap('edges');
      
      const nodesArr: any[] = [];
      nodesMap.forEach((val: any) => {
        try { nodesArr.push(JSON.parse(val)); } catch {}
      });
      const edgesArr: any[] = [];
      edgesMap.forEach((val: any) => {
        try { edgesArr.push(JSON.parse(val)); } catch {}
      });
      snapshotState = { nodes: nodesArr, edges: edgesArr };
    } catch (e) {
      console.error('[Prisma Sync] Failed to parse snapshot state for restore event:', e);
    }

    // Record RESTORE event
    await this.collaborationGateway.recordEvent(boardId, 'RESTORE', {
      versionId: version.id,
      name: version.name,
      snapshotState,
    }, userId);

    return { success: true, restoredTo: version.name };
  }
}
