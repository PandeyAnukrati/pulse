import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FilesModule } from './files/files.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    CollaborationModule,
    CommentsModule,
    NotificationsModule,
    FilesModule,
    AiModule,
  ],
})
export class AppModule {}
