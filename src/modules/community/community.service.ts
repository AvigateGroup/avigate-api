// src/modules/community/community.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CommunityPost } from './entities/community-post.entity';
import { DirectionShare } from './entities/direction-share.entity';
import { RouteContribution, ContributionStatus } from './entities/route-contribution.entity';
import { SafetyReport } from './entities/safety-report.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateDirectionShareDto } from './dto/create-direction-share.dto';
import { ReputationService } from '../reputation/reputation.service';
import * as crypto from 'crypto';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost)
    private postRepository: Repository<CommunityPost>,
    @InjectRepository(DirectionShare)
    private directionShareRepository: Repository<DirectionShare>,
    @InjectRepository(RouteContribution)
    private contributionRepository: Repository<RouteContribution>,
    @InjectRepository(SafetyReport)
    private safetyReportRepository: Repository<SafetyReport>,
    private reputationService: ReputationService,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: string) {
    const post = this.postRepository.create({
      ...createPostDto,
      authorId: userId,
      isVerified: false,
      isActive: true,
    });

    await this.postRepository.save(post);

    return {
      success: true,
      message: 'Post created successfully',
      data: { post },
    };
  }

  async getPosts(
    postType?: string,
    locationId?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: any = { isActive: true };
    if (postType) where.postType = postType;
    if (locationId) where.locationId = locationId;

    const [posts, total] = await this.postRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async createDirectionShare(
    createDirectionShareDto: CreateDirectionShareDto,
    userId: string,
  ) {
    const shareToken = this.generateShareToken();

    const directionShare = this.directionShareRepository.create({
      ...createDirectionShareDto,
      createdBy: userId,
      shareToken,
      status: 'active',
      accessCount: 0,
    });

    await this.directionShareRepository.save(directionShare);

    return {
      success: true,
      message: 'Direction share created successfully',
      data: {
        directionShare,
        shareUrl: `https://avigate.co/share/${shareToken}`,
      },
    };
  }

  async getDirectionShare(shareToken: string, userId?: string) {
    const directionShare = await this.directionShareRepository.findOne({
      where: { shareToken, status: 'active' },
    });

    if (!directionShare) {
      throw new NotFoundException('Direction share not found or expired');
    }

    // Check expiration
    if (directionShare.expiresAt && directionShare.expiresAt < new Date()) {
      directionShare.status = 'expired';
      await this.directionShareRepository.save(directionShare);
      throw new NotFoundException('Direction share has expired');
    }

    // Update access tracking
    directionShare.accessCount += 1;
    directionShare.lastAccessedBy = userId ?? '';
    directionShare.lastAccessedAt = new Date();
    await this.directionShareRepository.save(directionShare);

    return {
      success: true,
      data: { directionShare },
    };
  }

async submitContribution(contributionData: CreateContributionDto, userId: string) {
  const contribution = this.contributionRepository.create({
    ...contributionData,
    contributorId: userId,
    status: ContributionStatus.PENDING,
  });

  const savedContribution = await this.contributionRepository.save(contribution);

  // TypeScript now knows savedContribution is a RouteContribution with id
  await this.reputationService.awardRouteContributionPoints(
    userId,
    savedContribution.id,
  );

  return {
    success: true,
    message: 'Contribution submitted. You earned 15 reputation points!',
    data: { contribution: savedContribution },
  };
}

  async getContributions(status?: ContributionStatus, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status) where.status = status;

    const [contributions, total] = await this.contributionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      success: true,
      data: {
        contributions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async reportSafetyConcern(reportData: any, userId: string) {
    const report = this.safetyReportRepository.create({
      ...reportData,
      reportedBy: userId,
      isVerified: false,
      status: 'open',
    });

    await this.safetyReportRepository.save(report);

    return {
      success: true,
      message: 'Safety report submitted successfully',
      data: { report },
    };
  }

  async getSafetyReports(locationId?: string, status?: string) {
    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    // Get reports from last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    where.createdAt = MoreThan(ninetyDaysAgo);

    const reports = await this.safetyReportRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      success: true,
      data: { reports, count: reports.length },
    };
  }

  private generateShareToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}