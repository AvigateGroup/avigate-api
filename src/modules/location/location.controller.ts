// src/modules/location/location.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('locations')
@Controller('locations')
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search locations' })
  async searchLocations(
    @Query('q') query: string,
    @Query('city') city?: string,
  ) {
    return this.locationService.searchLocations(query, city);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby locations' })
  async getNearbyLocations(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.locationService.getNearbyLocations(lat, lng, radius);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular locations' })
  async getPopularLocations(
    @Query('city') city?: string,
    @Query('limit') limit?: number,
  ) {
    return this.locationService.getPopularLocations(city, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  async getLocationById(@Param('id') id: string) {
    return this.locationService.getLocationById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new location' })
  async createLocation(
    @Body() createLocationDto: CreateLocationDto,
    @CurrentUser() user: User,
  ) {
    return this.locationService.createLocation(createLocationDto, user.id);
  }
}
