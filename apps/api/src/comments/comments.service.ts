import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationGateway: CollaborationGateway,
    private readonly notificationsService: NotificationsService
  ) {}

  async listComments(workspaceId: string) {
    // Load top-level comments (threads)
    return this.prisma.comment.findMany({
      where: { workspaceId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async createComment(
    userId: string,
    workspaceId: string,
    content: string,
    x: number,
    y: number,
    nodeId?: string,
    parentId?: string
  ) {
    // 1. Verify user exists
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!author) {
      throw new NotFoundException('User not found');
    }

    const authorName = `${author.firstName} ${author.lastName}`;

    // 2. Create comment in database
    const comment = await this.prisma.comment.create({
      data: {
        workspaceId,
        userId,
        content,
        x,
        y,
        nodeId: nodeId || null,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // 3. Trigger WebSocket real-time sync
    if (this.collaborationGateway.server) {
      this.collaborationGateway.server.to(`board:${workspaceId}`).emit('comment-created', comment);
    }

    // 4. Handle notification triggers (mention parsing)
    await this.handleMentions(content, workspaceId, authorName, userId);

    // 5. Send notification to the parent thread owner (if it is a reply)
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (parentComment && parentComment.userId !== userId) {
        await this.notificationsService.createNotification(
          parentComment.userId,
          'New reply on comment thread',
          `${authorName} replied to your comment thread.`,
          `/board/${workspaceId}`
        );
      }
    }

    return comment;
  }

  async resolveComment(commentId: string, isResolved: boolean) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isResolved },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify other users
    if (this.collaborationGateway.server) {
      this.collaborationGateway.server.to(`board:${comment.workspaceId}`).emit('comment-resolved', {
        commentId,
        isResolved,
      });
    }

    return updated;
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only allow deletion if user is the comment owner
    if (comment.userId !== userId) {
      throw new NotFoundException('Permission denied');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    if (this.collaborationGateway.server) {
      this.collaborationGateway.server.to(`board:${comment.workspaceId}`).emit('comment-deleted', {
        commentId,
      });
    }

    return { success: true };
  }

  private async handleMentions(content: string, workspaceId: string, authorName: string, authorId: string) {
    const mentionRegex = /@([a-zA-Z0-9._%+--]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return;

    for (const match of matches) {
      const clean = match.substring(1); // strip '@'
      let targetUser = null;

      if (clean.includes('@')) {
        targetUser = await this.prisma.user.findUnique({ where: { email: clean } });
      } else {
        targetUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              { firstName: { equals: clean, mode: 'insensitive' } },
              { lastName: { equals: clean, mode: 'insensitive' } },
            ],
          },
        });
      }

      // Avoid notifying yourself
      if (targetUser && targetUser.id !== authorId) {
        await this.notificationsService.createNotification(
          targetUser.id,
          'You were mentioned',
          `${authorName} mentioned you in a comment: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
          `/board/${workspaceId}`
        );
      }
    }
  }
}
