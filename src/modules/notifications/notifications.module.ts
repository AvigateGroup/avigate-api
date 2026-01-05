// src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { UserDevice } from '../user/entities/user-device.entity';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserDevice, Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
