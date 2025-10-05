// src/modules/reputation/reputation.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private reputationService: ReputationService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user reputation' })
  async getMyReputation(@CurrentUser() user: User) {
    return this.reputationService.getUserReputation(user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get reputation leaderboard' })
  async getLeaderboard(@Query('limit') limit?: number) {
    return this.reputationService.getLeaderboard(limit);
  }
}
