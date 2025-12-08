// src/modules/journey/journey.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JourneyController } from './journey.controller';
import { JourneyService } from './services/journey.service';
import { JourneyNotificationService } from './services/journey-notification.service';
import { Journey } from './entities/journey.entity';
import { JourneyLeg } from './entities/journey-leg.entity';
import { RouteModule } from '../route/route.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Journey, JourneyLeg]),
    RouteModule,
    NotificationsModule,
  ],
  controllers: [JourneyController],
  providers: [JourneyService, JourneyNotificationService],
  exports: [JourneyService, JourneyNotificationService],
})
export class JourneyModule {}