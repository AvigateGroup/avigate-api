// src/modules/admin/admin.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { FareAdjustmentService } from './services/fare-adjustment.service';
import { ContributionManagementService } from './services/contribution-management.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private fareAdjustmentService: FareAdjustmentService,
    private contributionManagementService: ContributionManagementService,
  ) {}

  // ============================================
  // FARE ADJUSTMENT ENDPOINTS
  // ============================================

  @Post('fares/adjust')
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Adjust all fares by percentage (admin only)',
    description:
      'Increase or decrease all fares in the system by a percentage. Used for inflation adjustments, fuel price changes, etc.',
  })
  async adjustAllFares(
    @CurrentUser() user: User,
    @Body()
    body: {
      adjustmentPercentage: number;
      reason: string;
      city?: string;
      transportMode?: string;
    },
  ) {
    return this.fareAdjustmentService.adjustAllFares(
      user.id,
      body.adjustmentPercentage,
      body.reason,
      body.city,
      body.transportMode,
    );
  }

  @Post('fares/preview-adjustment')
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Preview fare adjustment without applying',
    description: 'See what the fares would be after adjustment without actually changing them',
  })
  async previewFareAdjustment(
    @Body()
    body: {
      adjustmentPercentage: number;
      city?: string;
      transportMode?: string;
    },
  ) {
    return this.fareAdjustmentService.previewFareAdjustment(
      body.adjustmentPercentage,
      body.city,
      body.transportMode,
    );
  }

  @Get('fares/adjustment-history')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get fare adjustment history' })
  async getFareAdjustmentHistory(@Query('limit') limit?: number) {
    return this.fareAdjustmentService.getFareAdjustmentHistory(limit);
  }

  // ============================================
  // CONTRIBUTION MANAGEMENT ENDPOINTS
  // ============================================

  @Get('contributions/pending')
  @Roles('admin', 'super_admin', 'moderator')
  @ApiOperation({ summary: 'Get pending contributions for review' })
  async getPendingContributions(@Query('limit') limit?: number) {
    return this.contributionManagementService.getPendingContributions(limit);
  }

  @Patch('contributions/:contributionId/review')
  @Roles('admin', 'super_admin', 'moderator')
  @ApiOperation({
    summary: 'Review a contribution',
    description: 'Approve, reject, or request changes on a user contribution',
  })
  async reviewContribution(
    @CurrentUser() user: User,
    @Param('contributionId') contributionId: string,
    @Body()
    body: {
      action: 'approve' | 'reject' | 'request_changes';
      reviewNotes: string;
    },
  ) {
    return this.contributionManagementService.reviewContribution(
      contributionId,
      user.id,
      body.action,
      body.reviewNotes,
    );
  }

  @Post('contributions/:contributionId/implement')
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Implement an approved contribution',
    description:
      'Apply an approved contribution to the live system (routes, segments, fares, etc.)',
  })
  async implementContribution(
    @CurrentUser() user: User,
    @Param('contributionId') contributionId: string,
  ) {
    return this.contributionManagementService.implementContribution(contributionId, user.id);
  }

  @Patch('contributions/:contributionId/edit')
  @Roles('admin', 'super_admin', 'moderator')
  @ApiOperation({
    summary: 'Edit a contribution before approval',
    description: 'Admin can edit contribution details before approving',
  })
  async editContribution(
    @CurrentUser() user: User,
    @Param('contributionId') contributionId: string,
    @Body() updates: any,
  ) {
    return this.contributionManagementService.editContribution(
      contributionId,
      user.id,
      updates,
    );
  }
}