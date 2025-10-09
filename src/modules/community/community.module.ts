// src/modules/community/community.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityPost } from './entities/community-post.entity';
import { DirectionShare } from './entities/direction-share.entity';
import { RouteContribution } from './entities/route-contribution.entity';
import { SafetyReport } from './entities/safety-report.entity';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommunityPost, DirectionShare, RouteContribution, SafetyReport]),
    ReputationModule,
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
