import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CollaborationModule, NotificationsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
