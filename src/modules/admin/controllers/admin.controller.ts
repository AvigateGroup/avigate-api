// src/modules/admin/admin.controller.ts
import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';
import { Admin } from '../entities/admin.entity';
import { FareAdjustmentService } from '../services/fare-adjustment.service';
import { ContributionManagementService } from '../services/contribution-management.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminAuthGuard, PermissionsGuard)
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
  @RequirePermissions('fares.edit')
  @ApiOperation({
    summary: 'Adjust all fares by percentage (admin only)',
    description:
      'Increase or decrease all fares in the system by a percentage. Used for inflation adjustments, fuel price changes, etc.',
  })
  async adjustAllFares(
    @CurrentAdmin() admin: Admin,
    @Body()
    body: {
      adjustmentPercentage: number;
      reason: string;
      city?: string;
      transportMode?: string;
    },
  ) {
    return this.fareAdjustmentService.adjustAllFares(
      admin.id,
      body.adjustmentPercentage,
      body.reason,
      body.city,
      body.transportMode,
    );
  }

  @Post('fares/preview-adjustment')
  @RequirePermissions('fares.view')
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
  @RequirePermissions('fares.view')
  @ApiOperation({ summary: 'Get fare adjustment history' })
  async getFareAdjustmentHistory(@Query('limit') limit?: number) {
    return this.fareAdjustmentService.getFareAdjustmentHistory(limit);
  }

  // ============================================
  // CONTRIBUTION MANAGEMENT ENDPOINTS
  // ============================================

  @Get('contributions/pending')
  @RequirePermissions('contributions.view')
  @ApiOperation({ summary: 'Get pending contributions for review' })
  async getPendingContributions(@Query('limit') limit?: number) {
    return this.contributionManagementService.getPendingContributions(limit);
  }

  @Patch('contributions/:contributionId/review')
  @RequirePermissions('contributions.review')
  @ApiOperation({
    summary: 'Review a contribution',
    description: 'Approve, reject, or request changes on a user contribution',
  })
  async reviewContribution(
    @CurrentAdmin() admin: Admin,
    @Param('contributionId') contributionId: string,
    @Body()
    body: {
      action: 'approve' | 'reject' | 'request_changes';
      reviewNotes: string;
    },
  ) {
    return this.contributionManagementService.reviewContribution(
      contributionId,
      admin.id,
      body.action,
      body.reviewNotes,
    );
  }

  @Post('contributions/:contributionId/implement')
  @RequirePermissions('contributions.implement')
  @ApiOperation({
    summary: 'Implement an approved contribution',
    description:
      'Apply an approved contribution to the live system (routes, segments, fares, etc.)',
  })
  async implementContribution(
    @CurrentAdmin() admin: Admin,
    @Param('contributionId') contributionId: string,
  ) {
    return this.contributionManagementService.implementContribution(contributionId, admin.id);
  }

  @Patch('contributions/:contributionId/edit')
  @RequirePermissions('contributions.edit')
  @ApiOperation({
    summary: 'Edit a contribution before approval',
    description: 'Admin can edit contribution details before approving',
  })
  async editContribution(
    @CurrentAdmin() admin: Admin,
    @Param('contributionId') contributionId: string,
    @Body() updates: any,
  ) {
    return this.contributionManagementService.editContribution(contributionId, admin.id, updates);
  }
}
