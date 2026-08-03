import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CollaborationGateway } from './collaboration.gateway';
import { PresenceService } from './presence.service';
import { WorkspacesController } from './workspaces.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'aether_super_secret_jwt_key_12345'),
      }),
    }),
  ],
  controllers: [WorkspacesController],
  providers: [CollaborationGateway, PresenceService],
  exports: [PresenceService, CollaborationGateway],
})
export class CollaborationModule {}
