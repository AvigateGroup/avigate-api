// src/modules/admin/controllers/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('admin')
@Controller('admin/analytics')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getDashboardOverview(@Query('period') period = '30') {
    return this.analyticsService.getDashboardOverview(Number(period));
  }

  @Get('user-growth')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get user growth metrics' })
  async getUserGrowthMetrics(
    @Query('period') period = '90',
    @Query('interval') interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.analyticsService.getUserGrowthMetrics(Number(period), interval);
  }
}
