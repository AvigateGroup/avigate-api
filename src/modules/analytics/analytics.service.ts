// src/modules/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { SearchLog } from './entities/search-log.entity';
import { TripLog } from './entities/trip-log.entity';
import { UserInteraction } from './entities/user-interaction.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(SearchLog)
    private searchLogRepository: Repository<SearchLog>,
    @InjectRepository(TripLog)
    private tripLogRepository: Repository<TripLog>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
  ) {}

  async logSearch(searchData: Partial<SearchLog>) {
    const log = this.searchLogRepository.create(searchData);
    await this.searchLogRepository.save(log);
  }

  async logTrip(tripData: Partial<TripLog>) {
    const log = this.tripLogRepository.create(tripData);
    return await this.tripLogRepository.save(log);
  }

  async logInteraction(interactionData: Partial<UserInteraction>) {
    const log = this.interactionRepository.create(interactionData);
    await this.interactionRepository.save(log);
  }

  async getSearchAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const searches = await this.searchLogRepository
      .createQueryBuilder('search')
      .select("DATE_TRUNC('day', search.createdAt)", 'date')
      .addSelect('COUNT(*)', 'searchCount')
      .addSelect('COUNT(DISTINCT search.userId)', 'uniqueUsers')
      .addSelect('AVG(search.resultCount)', 'avgResults')
      .addSelect(
        'SUM(CASE WHEN search.wasSuccessful THEN 1 ELSE 0 END)::float / COUNT(*) * 100',
        'successRate',
      )
      .where('search.createdAt >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', search.createdAt)")
      .orderBy("DATE_TRUNC('day', search.createdAt)", 'ASC')
      .getRawMany();

    return {
      success: true,
      data: { searches, period: `${days} days` },
    };
  }

  async getTripAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trips = await this.tripLogRepository
      .createQueryBuilder('trip')
      .select("DATE_TRUNC('day', trip.tripStartedAt)", 'date')
      .addSelect('COUNT(*)', 'tripCount')
      .addSelect('COUNT(DISTINCT trip.userId)', 'uniqueUsers')
      .addSelect('AVG(trip.actualDuration)', 'avgDuration')
      .addSelect('AVG(trip.totalFare)', 'avgFare')
      .addSelect(
        'SUM(CASE WHEN trip.wasSuccessful THEN 1 ELSE 0 END)::float / COUNT(*) * 100',
        'successRate',
      )
      .where('trip.tripStartedAt >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', trip.tripStartedAt)")
      .orderBy("DATE_TRUNC('day', trip.tripStartedAt)", 'ASC')
      .getRawMany();

    return {
      success: true,
      data: { trips, period: `${days} days` },
    };
  }

  async getUserEngagement(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const engagement = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select("DATE_TRUNC('day', interaction.createdAt)", 'date')
      .addSelect('COUNT(DISTINCT interaction.userId)', 'activeUsers')
      .addSelect('COUNT(*)', 'totalInteractions')
      .addSelect('interaction.interactionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('interaction.createdAt >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', interaction.createdAt)")
      .addGroupBy('interaction.interactionType')
      .orderBy("DATE_TRUNC('day', interaction.createdAt)", 'ASC')
      .getRawMany();

    return {
      success: true,
      data: { engagement, period: `${days} days` },
    };
  }
}
