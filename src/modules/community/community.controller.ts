// src/modules/community/community.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateDirectionShareDto } from './dto/create-direction-share.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create community post' })
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: User,
  ) {
    return this.communityService.createPost(createPostDto, user.id);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get community posts' })
  async getPosts(
    @Query('postType') postType?: string,
    @Query('locationId') locationId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.communityService.getPosts(postType, locationId, page, limit);
  }

  @Post('directions/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create direction share' })
  async createDirectionShare(
    @Body() createDirectionShareDto: CreateDirectionShareDto,
    @CurrentUser() user: User,
  ) {
    return this.communityService.createDirectionShare(createDirectionShareDto, user.id);
  }

  @Get('directions/share/:shareToken')
  @ApiOperation({ summary: 'Get shared directions' })
  async getDirectionShare(
    @Param('shareToken') shareToken: string,
    @CurrentUser() user?: User,
  ) {
    return this.communityService.getDirectionShare(shareToken, user?.id);
  }

  @Post('contributions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit route contribution' })
  async submitContribution(
    @Body() contributionData: any,
    @CurrentUser() user: User,
  ) {
    return this.communityService.submitContribution(contributionData, user.id);
  }

  @Get('contributions')
  @ApiOperation({ summary: 'Get contributions' })
  async getContributions(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.communityService.getContributions(status as any, page, limit);
  }

  @Post('safety/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report safety concern' })
  async reportSafetyConcern(
    @Body() reportData: any,
    @CurrentUser() user: User,
  ) {
    return this.communityService.reportSafetyConcern(reportData, user.id);
  }

  @Get('safety/reports')
  @ApiOperation({ summary: 'Get safety reports' })
  async getSafetyReports(
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    return this.communityService.getSafetyReports(locationId, status);
  }
}