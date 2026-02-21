// src/modules/journey/journey.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { JourneyService } from './services/journey.service';
import { JourneyNotificationService } from './services/journey-notification.service';
import { CreateJourneyDto, StartJourneyDto, UpdateJourneyLocationDto } from './dto';

@ApiTags('journey')
@Controller('journey')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JourneyController {
  constructor(
    private journeyService: JourneyService,
    private journeyNotificationService: JourneyNotificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journey plan' })
  @ApiResponse({ status: 201, description: 'Journey created successfully' })
  async createJourney(@CurrentUser() user: User, @Body() dto: CreateJourneyDto) {
    const journey = await this.journeyService.createJourney(user.id, dto);

    return {
      success: true,
      message: 'Journey planned successfully',
      data: journey,
    };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start journey tracking with notifications' })
  @ApiResponse({ status: 200, description: 'Journey tracking started' })
  async startJourney(
    @CurrentUser() user: User,
    @Param('id') journeyId: string,
    @Body() dto: StartJourneyDto,
  ) {
    // Start the journey
    const journey = await this.journeyService.startJourney(journeyId, dto);

    // Start real-time tracking and notifications
    await this.journeyNotificationService.startJourneyTracking(journeyId, user.id);

    return {
      success: true,
      message: 'Journey started. Real-time notifications enabled.',
      data: journey,
    };
  }

  @Put(':id/location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current location during journey' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @CurrentUser() user: User,
    @Param('id') journeyId: string,
    @Body() dto: UpdateJourneyLocationDto,
  ) {
    await this.journeyService.updateUserLocation(user.id, journeyId, dto.latitude, dto.longitude);

    return {
      success: true,
      message: 'Location updated',
    };
  }

  @Put(':id/stop')
  @ApiOperation({ summary: 'Stop journey tracking' })
  @ApiResponse({ status: 200, description: 'Journey tracking stopped' })
  async stopJourney(@CurrentUser() user: User, @Param('id') journeyId: string) {
    await this.journeyNotificationService.stopJourneyTracking(journeyId, user.id);

    return {
      success: true,
      message: 'Journey tracking stopped',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journey details' })
  @ApiResponse({ status: 200, description: 'Journey details retrieved' })
  async getJourney(@CurrentUser() user: User, @Param('id') journeyId: string) {
    const journey = await this.journeyService.getJourney(journeyId, user.id);

    return {
      success: true,
      data: journey,
    };
  }

  @Get('active/current')
  @ApiOperation({ summary: 'Get current active journey' })
  @ApiResponse({ status: 200, description: 'Active journey retrieved' })
  async getActiveJourney(@CurrentUser() user: User) {
    const journey = await this.journeyService.getActiveJourney(user.id);

    return {
      success: true,
      data: journey,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user journey history' })
  @ApiResponse({ status: 200, description: 'Journey history retrieved' })
  async getJourneyHistory(@CurrentUser() user: User) {
    const journeys = await this.journeyService.getJourneyHistory(user.id);

    return {
      success: true,
      data: journeys,
    };
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate a completed journey' })
  @ApiResponse({ status: 200, description: 'Journey rated successfully' })
  async rateJourney(
    @CurrentUser() user: User,
    @Param('id') journeyId: string,
    @Body() dto: { rating: number; feedback?: string },
  ) {
    await this.journeyService.rateJourney(journeyId, user.id, dto.rating, dto.feedback);

    return {
      success: true,
      message: 'Thank you for your feedback!',
    };
  }
}
