// src/modules/fare/fare.controller.ts
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FareService } from './fare.service';
import { SubmitFareFeedbackDto } from './dto/submit-fare-feedback.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('fares')
@Controller('fares')
export class FareController {
  constructor(private fareService: FareService) {}

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit fare feedback' })
  async submitFareFeedback(
    @Body() submitFareFeedbackDto: SubmitFareFeedbackDto,
    @CurrentUser() user: User,
  ) {
    return this.fareService.submitFareFeedback(submitFareFeedbackDto, user.id);
  }

  @Get('estimate/:routeId')
  @ApiOperation({ summary: 'Get fare estimate for route' })
  async getFareEstimate(
    @Param('routeId') routeId: string,
    @Query('transportMode') transportMode?: string,
  ) {
    return this.fareService.getFareEstimate(routeId, transportMode);
  }

  @Get('history/:routeId')
  @ApiOperation({ summary: 'Get fare history' })
  async getFareHistory(@Param('routeId') routeId: string, @Query('days') days?: number) {
    return this.fareService.getFareHistory(routeId, days);
  }
}
