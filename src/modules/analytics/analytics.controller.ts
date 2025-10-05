// src/modules/analytics/analytics.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log search event' })
  async logSearch(@Body() searchData: any, @CurrentUser() user: User) {
    return this.analyticsService.logSearch({ ...searchData, userId: user.id });
  }

  @Post('trip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log trip event' })
  async logTrip(@Body() tripData: any, @CurrentUser() user: User) {
    return this.analyticsService.logTrip({ ...tripData, userId: user.id });
  }

  @Post('interaction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log user interaction' })
  async logInteraction(@Body() interactionData: any, @CurrentUser() user: User) {
    return this.analyticsService.logInteraction({ ...interactionData, userId: user.id });
  }

  @Get('search')
  @ApiOperation({ summary: 'Get search analytics' })
  async getSearchAnalytics(@Query('days') days?: number) {
    return this.analyticsService.getSearchAnalytics(days);
  }

  @Get('trips')
  @ApiOperation({ summary: 'Get trip analytics' })
  async getTripAnalytics(@Query('days') days?: number) {
    return this.analyticsService.getTripAnalytics(days);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get user engagement analytics' })
  async getUserEngagement(@Query('days') days?: number) {
    return this.analyticsService.getUserEngagement(days);
  }
}
