// src/modules/location-share/location-share.module.ts (FIXED)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LocationShareController } from './location-share.controller';
import { LocationShareService } from './location-share.service';
import { QRCodeService } from './services/qr-code.service';
import { LocationShare } from './entities/location-share.entity';
import { User } from '../user/entities/user.entity';
import { RouteModule } from '../route/route.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { UploadModule } from '../upload/upload.module'; // ADDED: Missing module import

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationShare, User]),
    ConfigModule,
    RouteModule,
    NotificationsModule,
    EmailModule,
    UploadModule,
  ],
  controllers: [LocationShareController],
  providers: [LocationShareService, QRCodeService],
  exports: [LocationShareService, QRCodeService],
})
export class LocationShareModule {}
