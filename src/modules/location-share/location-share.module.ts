// src/modules/location-share/location-share.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LocationShareController } from './location-share.controller';
import { LocationShareService } from './location-share.service';
import { LocationShare } from './entities/location-share.entity';
import { User } from '../user/entities/user.entity';
import { RouteModule } from '../route/route.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationShare, User]),
    ConfigModule,
    RouteModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [LocationShareController],
  providers: [LocationShareService],
  exports: [LocationShareService],
})
export class LocationShareModule {}