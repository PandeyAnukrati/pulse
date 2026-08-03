import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationGateway: CollaborationGateway
  ) {}

  async listUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(userId: string, title: string, message: string, link?: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        link: link || null,
      },
    });

    // Attempt live socket transmission
    try {
      this.collaborationGateway.sendNotificationToUser(userId, notification);
    } catch (e) {
      console.error('[Notification Hub] Socket emit failed:', e);
    }

    return notification;
  }
}
