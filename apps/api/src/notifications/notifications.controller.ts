import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    return this.notificationsService.listUserNotifications(req.user.id);
  }

  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true };
  }
}
