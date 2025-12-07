// src/modules/reputation/reputation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReputationTransaction, ReputationAction } from './entities/reputation-transaction.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Badge } from './entities/badge.entity';
import { User } from '../user/entities/user.entity';
import { logger } from '@/utils/logger.util';

// Reputation point values for each action
const REPUTATION_POINTS = {
  [ReputationAction.FARE_FEEDBACK]: 5,
  [ReputationAction.ROUTE_CONTRIBUTION]: 15,
  [ReputationAction.SAFETY_REPORT]: 10,
  [ReputationAction.COMMUNITY_POST]: 3,
  [ReputationAction.HELPFUL_REVIEW]: 2,
  [ReputationAction.VERIFIED_CONTRIBUTION]: 25, // Bonus when admin verifies
  [ReputationAction.DIRECTION_SHARE]: 5,
  [ReputationAction.COMPLETE_TRIP]: 1,
  [ReputationAction.PENALTY_SPAM]: -20,
  [ReputationAction.PENALTY_INACCURATE]: -10,
};

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(ReputationTransaction)
    private transactionRepository: Repository<ReputationTransaction>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async awardPoints(
    userId: string,
    action: ReputationAction,
    options: {
      relatedEntityId?: string;
      relatedEntityType?: string;
      reason?: string;
      customPoints?: number;
      metadata?: Record<string, any>;
    } = {},
  ) {
    const points = options.customPoints ?? REPUTATION_POINTS[action] ?? 0;

    // Create transaction record
    const transaction = this.transactionRepository.create({
      userId,
      action,
      points,
      reason: options.reason,
      relatedEntityId: options.relatedEntityId,
      relatedEntityType: options.relatedEntityType,
      metadata: options.metadata,
    });

    await this.transactionRepository.save(transaction);

    // Update user's reputation score
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.reputationScore = Math.max(0, user.reputationScore + points);
      user.totalContributions += points > 0 ? 1 : 0;
      await this.userRepository.save(user);

      // Check for new badges
      await this.checkAndAwardBadges(user);

      logger.info(`Awarded ${points} reputation points to user ${userId} for ${action}`);
    }

    return {
      success: true,
      data: {
        transaction,
        newBalance: user ? user.reputationScore : 0,
      },
    };
  }

  async checkAndAwardBadges(user: User) {
    const badges = await this.badgeRepository.find();
    const userBadges = await this.userBadgeRepository.find({
      where: { userId: user.id },
      relations: ['badge'],
    });

    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

    for (const badge of badges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      // Check if user meets requirements
      const meetsRequirements = await this.checkBadgeRequirements(user, badge.requirements);

      if (meetsRequirements) {
        await this.awardBadge(user.id, badge.id);
      }
    }
  }

  private async checkBadgeRequirements(user: User, requirements: any): Promise<boolean> {
    switch (requirements.type) {
      case 'reputation':
        return user.reputationScore >= requirements.value;

      case 'action_count':
        const count = await this.transactionRepository.count({
          where: {
            userId: user.id,
            action: requirements.action,
          },
        });
        return count >= requirements.value;

      case 'special':
        // Handle special badge requirements
        return false;

      default:
        return false;
    }
  }

  private async awardBadge(userId: string, badgeId: string) {
    const userBadge = this.userBadgeRepository.create({
      userId,
      badgeId,
      earnedAt: new Date(),
      isDisplayed: false,
    });

    await this.userBadgeRepository.save(userBadge);

    logger.info(`Awarded badge ${badgeId} to user ${userId}`);
  }

  async getUserReputation(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'reputationScore', 'totalContributions'],
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        data: null,
      };
    }

    const transactions = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const badges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });

    // Calculate breakdown by action type
    const breakdown = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.action', 'action')
      .addSelect('SUM(transaction.points)', 'totalPoints')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.userId = :userId', { userId })
      .groupBy('transaction.action')
      .getRawMany();

    return {
      success: true,
      data: {
        currentScore: user.reputationScore,
        totalContributions: user.totalContributions,
        recentTransactions: transactions,
        badges: badges.map(ub => ({
          ...ub.badge,
          earnedAt: ub.earnedAt,
          isDisplayed: ub.isDisplayed,
        })),
        breakdown,
        rank: await this.getUserRank(userId),
      },
    };
  }

  async getUserRank(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    const rank = await this.userRepository
      .createQueryBuilder('user')
      .where('user.reputationScore > :score', { score: user.reputationScore })
      .getCount();

    return rank + 1;
  }

  async getLeaderboard(limit: number = 50) {
    const users = await this.userRepository.find({
      where: { isActive: true },
      order: { reputationScore: 'DESC' },
      take: limit,
      select: ['id', 'firstName', 'lastName', 'reputationScore', 'totalContributions'],
    });

    return {
      success: true,
      data: {
        leaderboard: users.map((user, index) => ({
          rank: index + 1,
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          reputationScore: user.reputationScore,
          totalContributions: user.totalContributions,
        })),
      },
    };
  }

  // Convenience methods for common actions
  async awardFareFeedbackPoints(userId: string, feedbackId: string) {
    return this.awardPoints(userId, ReputationAction.FARE_FEEDBACK, {
      relatedEntityId: feedbackId,
      relatedEntityType: 'fare_feedback',
      reason: 'Submitted fare feedback',
    });
  }

  async awardRouteContributionPoints(userId: string, contributionId: string) {
    return this.awardPoints(userId, ReputationAction.ROUTE_CONTRIBUTION, {
      relatedEntityId: contributionId,
      relatedEntityType: 'route_contribution',
      reason: 'Submitted route contribution',
    });
  }

  async awardVerificationBonus(userId: string, contributionId: string) {
    return this.awardPoints(userId, ReputationAction.VERIFIED_CONTRIBUTION, {
      relatedEntityId: contributionId,
      relatedEntityType: 'contribution',
      reason: 'Contribution verified by admin',
    });
  }

  async penalizeSpam(userId: string, reason: string) {
    return this.awardPoints(userId, ReputationAction.PENALTY_SPAM, {
      reason,
    });
  }

  async penalizeInaccurate(userId: string, entityId: string, reason: string) {
    return this.awardPoints(userId, ReputationAction.PENALTY_INACCURATE, {
      relatedEntityId: entityId,
      reason,
    });
  }

  /**
   * Award bonus reputation points when a route contribution is approved by admin
   * Called by ContributionManagementService when admin approves a contribution
   */
  async awardApprovedContributionBonus(
    userId: string,
    contributionId: string,
  ): Promise<any> {
    const APPROVED_CONTRIBUTION_BONUS = 50; // Bonus points for approved contribution
    
    return this.awardPoints(userId, ReputationAction.VERIFIED_CONTRIBUTION, {
      relatedEntityId: contributionId,
      relatedEntityType: 'route_contribution',
      reason: `Route contribution ${contributionId} was approved by admin`,
      customPoints: APPROVED_CONTRIBUTION_BONUS,
    });
  }

  /**
   * Award bonus reputation points when a route contribution is implemented/goes live
   * Called by ContributionManagementService when contribution is marked as implemented
   */
  async awardImplementedContributionBonus(
    userId: string,
    contributionId: string,
  ): Promise<any> {
    const IMPLEMENTED_CONTRIBUTION_BONUS = 100; // Bonus points for implemented contribution
    
    return this.awardPoints(userId, ReputationAction.VERIFIED_CONTRIBUTION, {
      relatedEntityId: contributionId,
      relatedEntityType: 'route_contribution',
      reason: `Route contribution ${contributionId} was implemented and is now live`,
      customPoints: IMPLEMENTED_CONTRIBUTION_BONUS,
    });
  }
}