// src/modules/fare/fare.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { FareFeedback } from './entities/fare-feedback.entity';
import { FareHistory } from './entities/fare-history.entity';
import { FareRule } from './entities/fare-rule.entity';
import { SubmitFareFeedbackDto } from './dto/submit-fare-feedback.dto';
import { ReputationService } from '../reputation/reputation.service';

@Injectable()
export class FareService {
  constructor(
    @InjectRepository(FareFeedback)
    private fareFeedbackRepository: Repository<FareFeedback>,
    @InjectRepository(FareHistory)
    private fareHistoryRepository: Repository<FareHistory>,
    @InjectRepository(FareRule)
    private fareRuleRepository: Repository<FareRule>,
    private reputationService: ReputationService,
  ) {}

  async submitFareFeedback(submitFareFeedbackDto: SubmitFareFeedbackDto, userId: string) {
    const feedback = this.fareFeedbackRepository.create({
      ...submitFareFeedbackDto,
      userId,
      isVerified: false,
    });

    await this.fareFeedbackRepository.save(feedback);

    // Award reputation points for contribution
    await this.reputationService.awardFareFeedbackPoints(userId, feedback.id);

    return {
      success: true,
      message: 'Fare feedback submitted successfully. You earned 5 reputation points!',
      data: { feedback },
    };
  }

  async getFareEstimate(routeId: string, transportMode?: string) {
    // Get recent fare feedback
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = this.fareFeedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.routeId = :routeId', { routeId })
      .andWhere('feedback.isVerified = :isVerified', { isVerified: true })
      .andWhere('feedback.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });

    if (transportMode) {
      query.andWhere('feedback.transportMode = :transportMode', {
        transportMode,
      });
    }

    const feedbacks = await query.getMany();

    if (feedbacks.length === 0) {
      return {
        success: true,
        data: {
          minFare: null,
          maxFare: null,
          avgFare: null,
          sampleSize: 0,
        },
      };
    }

    const fares = feedbacks.map(f => Number(f.farePaid));
    const minFare = Math.min(...fares);
    const maxFare = Math.max(...fares);
    const avgFare = fares.reduce((a, b) => a + b, 0) / fares.length;

    return {
      success: true,
      data: {
        minFare: minFare.toFixed(2),
        maxFare: maxFare.toFixed(2),
        avgFare: avgFare.toFixed(2),
        sampleSize: feedbacks.length,
        lastUpdated: new Date(),
      },
    };
  }

  async getFareHistory(routeId: string, days: number = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.fareHistoryRepository.find({
      where: {
        routeId,
        effectiveDate: MoreThanOrEqual(startDate),
      },
      order: { effectiveDate: 'ASC' },
    });

    return {
      success: true,
      data: { history, count: history.length },
    };
  }
}
