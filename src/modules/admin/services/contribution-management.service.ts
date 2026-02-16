// src/modules/admin/services/contribution-management.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  RouteContribution,
  ContributionStatus,
} from '../../community/entities/route-contribution.entity';
import { Route } from '../../route/entities/route.entity';
import { RouteSegment } from '../../route/entities/route-segment.entity';
import { RouteStep } from '../../route/entities/route-step.entity';
import { Location } from '../../location/entities/location.entity';
import { ReputationService } from '../../reputation/reputation.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { logger } from '@/utils/logger.util';

@Injectable()
export class ContributionManagementService {
  constructor(
    @InjectRepository(RouteContribution)
    private contributionRepository: Repository<RouteContribution>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    @InjectRepository(RouteStep)
    private stepRepository: Repository<RouteStep>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private reputationService: ReputationService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Review a contribution (approve, reject, or request changes)
   */
  async reviewContribution(
    contributionId: string,
    adminUserId: string,
    action: 'approve' | 'reject' | 'request_changes',
    reviewNotes: string,
  ) {
    const contribution = await this.contributionRepository.findOne({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    const previousStatus = contribution.status;
    contribution.reviewedBy = adminUserId;
    contribution.reviewedAt = new Date();
    contribution.reviewNotes = reviewNotes;

    if (action === 'approve') {
      contribution.status = ContributionStatus.APPROVED;

      // Award bonus reputation points for approved contribution
      await this.reputationService.awardApprovedContributionBonus(
        contribution.contributorId,
        contributionId,
      );

      // Notify contributor
      await this.notificationsService.sendToUser(contribution.contributorId, {
        title: 'Contribution Approved! 🎉',
        body: `Your route contribution has been approved and will be implemented soon. You earned bonus reputation points!`,
        type: NotificationType.CONTRIBUTION_APPROVED,
        data: {
          contributionId: contribution.id,
        },
      });
    } else if (action === 'reject') {
      contribution.status = ContributionStatus.REJECTED;

      await this.notificationsService.sendToUser(contribution.contributorId, {
        title: 'Contribution Not Approved',
        body: `Your route contribution was not approved. Reason: ${reviewNotes}`,
        type: NotificationType.CONTRIBUTION_REJECTED,
        data: {
          contributionId: contribution.id,
        },
      });
    } else if (action === 'request_changes') {
      contribution.status = ContributionStatus.UNDER_REVIEW;

      await this.notificationsService.sendToUser(contribution.contributorId, {
        title: 'Changes Requested',
        body: `Changes requested on your contribution: ${reviewNotes}`,
        type: NotificationType.CONTRIBUTION_CHANGES_REQUESTED,
        data: {
          contributionId: contribution.id,
        },
      });
    }

    await this.contributionRepository.save(contribution);

    logger.info('Contribution reviewed', {
      contributionId,
      action,
      previousStatus,
      newStatus: contribution.status,
      reviewedBy: adminUserId,
    });

    return {
      success: true,
      data: { contribution },
      message: `Contribution ${action}ed successfully`,
    };
  }

  /**
   * Implement an approved contribution
   */
  async implementContribution(contributionId: string, adminUserId: string) {
    const contribution = await this.contributionRepository.findOne({
      where: { id: contributionId, status: ContributionStatus.APPROVED },
    });

    if (!contribution) {
      throw new NotFoundException('Approved contribution not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let result: any;

      switch (contribution.contributionType) {
        case 'new_route':
          result = await this.implementNewRoute(contribution, queryRunner);
          break;

        case 'route_update':
          result = await this.implementRouteUpdate(contribution, queryRunner);
          break;

        case 'fare_correction':
          result = await this.implementFareCorrection(contribution, queryRunner);
          break;

        case 'new_intermediate_stop':
          result = await this.implementNewIntermediateStop(contribution, queryRunner);
          break;

        case 'instructions_update':
          result = await this.implementInstructionsUpdate(contribution, queryRunner);
          break;

        default:
          throw new Error(`Unknown contribution type: ${contribution.contributionType}`);
      }

      // Update contribution status
      contribution.status = ContributionStatus.IMPLEMENTED;
      contribution.implementedBy = adminUserId;
      contribution.implementedAt = new Date();
      await queryRunner.manager.save(contribution);

      await queryRunner.commitTransaction();

      // Award implementation bonus
      await this.reputationService.awardImplementedContributionBonus(
        contribution.contributorId,
        contributionId,
      );

      // Notify contributor
      await this.notificationsService.sendToUser(contribution.contributorId, {
        title: 'Contribution Implemented! 🚀',
        body: `Your contribution has been implemented and is now live in Avigate. Thanks for making navigation better!`,
        type: NotificationType.CONTRIBUTION_IMPLEMENTED,
        data: {
          contributionId: contribution.id,
          resultId: result.id,
        },
      });

      logger.info('Contribution implemented successfully', {
        contributionId,
        contributionType: contribution.contributionType,
        implementedBy: adminUserId,
      });

      return {
        success: true,
        data: { contribution, result },
        message: 'Contribution implemented successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to implement contribution:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Edit contribution before approval
   */
  async editContribution(
    contributionId: string,
    adminUserId: string,
    updates: Partial<RouteContribution>,
  ) {
    const contribution = await this.contributionRepository.findOne({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Only allow editing if pending or under review
    if (
      contribution.status !== ContributionStatus.PENDING &&
      contribution.status !== ContributionStatus.UNDER_REVIEW
    ) {
      throw new Error('Can only edit pending or under-review contributions');
    }

    // Update allowed fields
    if (updates.description) contribution.description = updates.description;
    if (updates.proposedData) {
      contribution.proposedData = {
        ...contribution.proposedData,
        ...updates.proposedData,
      };
    }
    if (updates.reviewNotes) contribution.reviewNotes = updates.reviewNotes;

    contribution.reviewedBy = adminUserId;
    contribution.reviewedAt = new Date();

    await this.contributionRepository.save(contribution);

    logger.info('Contribution edited', {
      contributionId,
      editedBy: adminUserId,
    });

    return {
      success: true,
      data: { contribution },
      message: 'Contribution updated successfully',
    };
  }

  /**
   * Get pending contributions for review
   */
  async getPendingContributions(limit: number = 50) {
    const contributions = await this.contributionRepository.find({
      where: { status: ContributionStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return {
      success: true,
      data: { contributions, count: contributions.length },
    };
  }

  /**
   * Private: Implement new route
   */
  private async implementNewRoute(contribution: RouteContribution, queryRunner: any) {
    const data = contribution.proposedData;

    const route = queryRunner.manager.create(Route, {
      name: data.name,
      startLocationId: contribution.startLocationId,
      endLocationId: contribution.endLocationId,
      description: data.description,
      transportModes: data.transportModes || [],
      estimatedDuration: data.estimatedDuration,
      distance: data.distance,
      minFare: data.minFare,
      maxFare: data.maxFare,
      isVerified: true,
      isActive: true,
      createdBy: contribution.contributorId,
      verifiedBy: contribution.implementedBy,
      metadata: {
        sourceContributionId: contribution.id,
        contributedBy: contribution.contributorId,
      },
    });

    return queryRunner.manager.save(route);
  }

  /**
   * Private: Implement route update
   */
  private async implementRouteUpdate(contribution: RouteContribution, queryRunner: any) {
    const route = await queryRunner.manager.findOne(Route, {
      where: { id: contribution.routeId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const updates = contribution.proposedData;

    if (updates.name) route.name = updates.name;
    if (updates.description) route.description = updates.description;
    if (updates.transportModes) route.transportModes = updates.transportModes;
    if (updates.estimatedDuration) route.estimatedDuration = updates.estimatedDuration;
    if (updates.distance) route.distance = updates.distance;
    if (updates.minFare) route.minFare = updates.minFare;
    if (updates.maxFare) route.maxFare = updates.maxFare;

    return queryRunner.manager.save(route);
  }

  /**
   * Private: Implement fare correction
   */
  private async implementFareCorrection(contribution: RouteContribution, queryRunner: any) {
    if (contribution.routeId) {
      const route = await queryRunner.manager.findOne(Route, {
        where: { id: contribution.routeId },
      });

      if (route) {
        route.minFare = contribution.proposedData.minFare;
        route.maxFare = contribution.proposedData.maxFare;
        return queryRunner.manager.save(route);
      }
    }

    throw new NotFoundException('Route not found for fare correction');
  }

  /**
   * Private: Implement new intermediate stop
   */
  private async implementNewIntermediateStop(contribution: RouteContribution, queryRunner: any) {
    const data = contribution.proposedData;

    // Find the segment to add the stop to
    const segment = await queryRunner.manager.findOne(RouteSegment, {
      where: { id: data.segmentId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    // Add the new stop to intermediate stops
    const newStop = {
      locationId: data.locationId,
      name: data.stopName,
      order: data.order || segment.intermediateStops.length + 1,
      isOptional: data.isOptional || false,
    };

    segment.intermediateStops = [...segment.intermediateStops, newStop].sort(
      (a, b) => a.order - b.order,
    );

    // Update landmarks if provided
    if (data.landmarks) {
      segment.landmarks = [...(segment.landmarks || []), ...data.landmarks];
    }

    return queryRunner.manager.save(segment);
  }

  /**
   * Private: Implement instructions update
   */
  private async implementInstructionsUpdate(contribution: RouteContribution, queryRunner: any) {
    const data = contribution.proposedData;

    if (data.segmentId) {
      const segment = await queryRunner.manager.findOne(RouteSegment, {
        where: { id: data.segmentId },
      });

      if (segment) {
        segment.instructions = data.instructions;
        if (data.landmarks) {
          segment.landmarks = data.landmarks;
        }
        return queryRunner.manager.save(segment);
      }
    }

    if (data.stepId) {
      const step = await queryRunner.manager.findOne(RouteStep, {
        where: { id: data.stepId },
      });

      if (step) {
        step.instructions = data.instructions;
        return queryRunner.manager.save(step);
      }
    }

    throw new NotFoundException('Segment or step not found for instructions update');
  }
}
