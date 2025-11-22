// src/modules/admin/services/fare-adjustment.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Route } from '../../route/entities/route.entity';
import { RouteSegment } from '../../route/entities/route-segment.entity';
import { RouteStep } from '../../route/entities/route-step.entity';
import { FareHistory } from '../../fare/entities/fare-history.entity';
import { FareRule } from '../../fare/entities/fare-rule.entity';
import { logger } from '@/utils/logger.util';

export interface FareAdjustmentResult {
  routesUpdated: number;
  segmentsUpdated: number;
  stepsUpdated: number;
  oldAverageFare: number;
  newAverageFare: number;
  adjustmentPercentage: number;
}

@Injectable()
export class FareAdjustmentService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    @InjectRepository(RouteStep)
    private stepRepository: Repository<RouteStep>,
    @InjectRepository(FareHistory)
    private fareHistoryRepository: Repository<FareHistory>,
    @InjectRepository(FareRule)
    private fareRuleRepository: Repository<FareRule>,
    private dataSource: DataSource,
  ) {}

  /**
   * Adjust all fares in the system by a percentage
   * Used for inflation adjustments, fuel price increases, etc.
   */
  async adjustAllFares(
    adminUserId: string,
    adjustmentPercentage: number,
    reason: string,
    city?: string,
    transportMode?: string,
  ): Promise<FareAdjustmentResult> {
    logger.info('Starting fare adjustment', {
      adminUserId,
      adjustmentPercentage,
      reason,
      city,
      transportMode,
    });

    // Validate percentage (between -50% and 100%)
    if (adjustmentPercentage < -50 || adjustmentPercentage > 100) {
      throw new ForbiddenException('Adjustment percentage must be between -50% and 100%');
    }

    const multiplier = 1 + adjustmentPercentage / 100;

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let routesUpdated = 0;
      let segmentsUpdated = 0;
      let stepsUpdated = 0;
      let oldTotalFare = 0;
      let newTotalFare = 0;

      // 1. Update Routes
      const routeQuery = this.routeRepository.createQueryBuilder('route');

      if (city) {
        routeQuery
          .leftJoin('route.startLocation', 'location')
          .andWhere('location.city = :city', { city });
      }

      if (transportMode) {
        routeQuery.andWhere(':transportMode = ANY(route.transportModes)', { transportMode });
      }

      const routes = await routeQuery.getMany();

      for (const route of routes) {
        // Store old fare for history
        await this.createFareHistory(route.id, null, {
          minFare: route.minFare ? Number(route.minFare) : 0,
          maxFare: route.maxFare ? Number(route.maxFare) : 0,
          avgFare: route.minFare && route.maxFare
            ? (Number(route.minFare) + Number(route.maxFare)) / 2
            : 0,
          transportMode: route.transportModes[0] || 'bus',
          createdBy: adminUserId,
          metadata: {
            adjustmentReason: reason,
            oldMinFare: route.minFare,
            oldMaxFare: route.maxFare,
          },
        });

        oldTotalFare += route.minFare && route.maxFare
          ? (Number(route.minFare) + Number(route.maxFare)) / 2
          : 0;

        // Update fares
        if (route.minFare) {
          route.minFare = Math.round(Number(route.minFare) * multiplier);
        }
        if (route.maxFare) {
          route.maxFare = Math.round(Number(route.maxFare) * multiplier);
        }

        await queryRunner.manager.save(route);

        newTotalFare += route.minFare && route.maxFare
          ? (Number(route.minFare) + Number(route.maxFare)) / 2
          : 0;

        routesUpdated++;
      }

      // 2. Update Route Segments
      const segmentQuery = this.segmentRepository.createQueryBuilder('segment');

      if (city) {
        segmentQuery
          .leftJoin('segment.startLocation', 'location')
          .andWhere('location.city = :city', { city });
      }

      if (transportMode) {
        segmentQuery.andWhere(':transportMode = ANY(segment.transportModes)', { transportMode });
      }

      const segments = await segmentQuery.getMany();

      for (const segment of segments) {
        if (segment.minFare) {
          segment.minFare = Math.round(Number(segment.minFare) * multiplier);
        }
        if (segment.maxFare) {
          segment.maxFare = Math.round(Number(segment.maxFare) * multiplier);
        }

        await queryRunner.manager.save(segment);
        segmentsUpdated++;
      }

      // 3. Update Route Steps
      const stepQuery = this.stepRepository.createQueryBuilder('step');

      if (transportMode) {
        stepQuery.andWhere('step.transportMode = :transportMode', { transportMode });
      }

      const steps = await stepQuery.getMany();

      for (const step of steps) {
        if (step.estimatedFare) {
          step.estimatedFare = Math.round(Number(step.estimatedFare) * multiplier);
        }

        await queryRunner.manager.save(step);
        stepsUpdated++;
      }

      // 4. Create Fare Rule
      await this.createFareRule({
        name: `Fare Adjustment - ${new Date().toLocaleDateString()}`,
        description: reason,
        city: city || 'All Cities',
        transportMode: transportMode || 'All',
        multiplier,
        effectiveFrom: new Date(),
        createdBy: adminUserId,
      });

      await queryRunner.commitTransaction();

      logger.info('Fare adjustment completed successfully', {
        routesUpdated,
        segmentsUpdated,
        stepsUpdated,
      });

      return {
        routesUpdated,
        segmentsUpdated,
        stepsUpdated,
        oldAverageFare: routes.length > 0 ? oldTotalFare / routes.length : 0,
        newAverageFare: routes.length > 0 ? newTotalFare / routes.length : 0,
        adjustmentPercentage,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Fare adjustment failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Preview fare adjustment without applying it
   */
  async previewFareAdjustment(
    adjustmentPercentage: number,
    city?: string,
    transportMode?: string,
  ) {
    const multiplier = 1 + adjustmentPercentage / 100;

    const routeQuery = this.routeRepository.createQueryBuilder('route');

    if (city) {
      routeQuery
        .leftJoin('route.startLocation', 'location')
        .andWhere('location.city = :city', { city });
    }

    if (transportMode) {
      routeQuery.andWhere(':transportMode = ANY(route.transportModes)', { transportMode });
    }

    const routes = await routeQuery.take(10).getMany();

    const preview = routes.map(route => ({
      routeName: route.name,
      currentMinFare: route.minFare,
      currentMaxFare: route.maxFare,
      newMinFare: route.minFare ? Math.round(Number(route.minFare) * multiplier) : null,
      newMaxFare: route.maxFare ? Math.round(Number(route.maxFare) * multiplier) : null,
      difference: route.minFare && route.maxFare
        ? Math.round(((Number(route.minFare) + Number(route.maxFare)) / 2) * (multiplier - 1))
        : 0,
    }));

    return {
      success: true,
      data: {
        preview,
        totalRoutesAffected: await routeQuery.getCount(),
        adjustmentPercentage,
        multiplier,
      },
    };
  }

  /**
   * Get fare adjustment history
   */
  async getFareAdjustmentHistory(limit: number = 20) {
    const rules = await this.fareRuleRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      success: true,
      data: { rules },
    };
  }

  /**
   * Create fare history record
   */
  private async createFareHistory(
    routeId: string,
    routeStepId: string | null,
    data: {
      minFare: number;
      maxFare: number;
      avgFare: number;
      transportMode: string;
      createdBy: string;
      metadata?: Record<string, any>;
    },
  ) {
    const history = this.fareHistoryRepository.create({
      routeId,
      routeStepId,
      minFare: data.minFare,
      maxFare: data.maxFare,
      avgFare: data.avgFare,
      transportMode: data.transportMode,
      effectiveDate: new Date(),
      createdBy: data.createdBy,
      metadata: data.metadata,
    });

    return this.fareHistoryRepository.save(history);
  }

  /**
   * Create fare rule record
   */
  private async createFareRule(data: {
    name: string;
    description: string;
    city: string;
    transportMode: string;
    multiplier: number;
    effectiveFrom: Date;
    createdBy: string;
  }) {
    const rule = this.fareRuleRepository.create({
      ...data,
      isActive: true,
    });

    return this.fareRuleRepository.save(rule);
  }
}