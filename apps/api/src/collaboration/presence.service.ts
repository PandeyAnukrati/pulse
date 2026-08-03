import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

export interface UserPresence {
  userId: string;
  socketId: string;
  firstName: string;
  lastName: string;
  x: number;
  y: number;
  isTyping: boolean;
  selectedNodeId?: string;
  color: string;
}

@Injectable()
export class PresenceService implements OnModuleInit {
  private redisClient: Redis | null = null;
  // Local fallback storage when Redis is not available
  private localPresence: Map<string, Map<string, UserPresence>> = new Map();

  // Color options for users on a board
  private colors = [
    '#FF5C00', // Orange
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#3B82F6', // Blue
    '#F59E0B', // Yellow
    '#EC4899', // Pink
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl);
        console.log('[Presence Service] Connected to Redis successfully.');
      } catch (e) {
        console.warn('[Presence Service] Redis connection failed, falling back to local memory.');
      }
    } else {
      console.log('[Presence Service] No REDIS_URL found, running in-memory presence mode.');
    }
  }

  private getUserColor(userId: string): string {
    // Generate a stable color based on the hash of the user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.colors.length;
    return this.colors[index];
  }

  async registerUser(boardId: string, socketId: string, userId: string): Promise<UserPresence> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const name = user ? { firstName: user.firstName, lastName: user.lastName } : { firstName: 'Anonymous', lastName: 'User' };
    const color = this.getUserColor(userId);

    const presence: UserPresence = {
      userId,
      socketId,
      firstName: name.firstName,
      lastName: name.lastName,
      x: 0,
      y: 0,
      isTyping: false,
      color,
    };

    if (this.redisClient) {
      const key = `presence:${boardId}`;
      await this.redisClient.hset(key, socketId, JSON.stringify(presence));
      await this.redisClient.expire(key, 86400); // 1 Day expiry
    } else {
      if (!this.localPresence.has(boardId)) {
        this.localPresence.set(boardId, new Map());
      }
      this.localPresence.get(boardId)!.set(socketId, presence);
    }

    return presence;
  }

  async removeUser(boardId: string, socketId: string): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.hdel(`presence:${boardId}`, socketId);
    } else {
      const board = this.localPresence.get(boardId);
      if (board) {
        board.delete(socketId);
        if (board.size === 0) {
          this.localPresence.delete(boardId);
        }
      }
    }
  }

  async updateCursor(boardId: string, socketId: string, x: number, y: number): Promise<void> {
    const presence = await this.getUserPresence(boardId, socketId);
    if (!presence) return;

    presence.x = x;
    presence.y = y;

    await this.savePresence(boardId, socketId, presence);
  }

  async updateTyping(boardId: string, socketId: string, isTyping: boolean): Promise<void> {
    const presence = await this.getUserPresence(boardId, socketId);
    if (!presence) return;

    presence.isTyping = isTyping;

    await this.savePresence(boardId, socketId, presence);
  }

  async updateSelection(boardId: string, socketId: string, nodeId?: string): Promise<void> {
    const presence = await this.getUserPresence(boardId, socketId);
    if (!presence) return;

    presence.selectedNodeId = nodeId;

    await this.savePresence(boardId, socketId, presence);
  }

  async getBoardPresence(boardId: string): Promise<UserPresence[]> {
    if (this.redisClient) {
      const hash = await this.redisClient.hgetall(`presence:${boardId}`);
      return Object.values(hash).map((val) => JSON.parse(val));
    } else {
      const board = this.localPresence.get(boardId);
      if (!board) return [];
      return Array.from(board.values());
    }
  }

  private async getUserPresence(boardId: string, socketId: string): Promise<UserPresence | null> {
    if (this.redisClient) {
      const data = await this.redisClient.hget(`presence:${boardId}`, socketId);
      return data ? JSON.parse(data) : null;
    } else {
      const board = this.localPresence.get(boardId);
      return board ? board.get(socketId) || null : null;
    }
  }

  private async savePresence(boardId: string, socketId: string, presence: UserPresence): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.hset(`presence:${boardId}`, socketId, JSON.stringify(presence));
    } else {
      const board = this.localPresence.get(boardId);
      if (board) {
        board.set(socketId, presence);
      }
    }
  }
}
