// src/modules/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SearchLog } from './entities/search-log.entity';
import { TripLog } from './entities/trip-log.entity';
import { UserInteraction } from './entities/user-interaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SearchLog, TripLog, UserInteraction])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}