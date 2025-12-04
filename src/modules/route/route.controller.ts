// src/modules/route/route.controller.ts (UPDATED WITH END TRIP ENDPOINT)
import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { RouteService } from './route.service';
import { TripService } from './services/trip.service';
import { RouteMatchingService } from './services/route-matching.service';
import { FindRoutesDto } from './dto/find-routes.dto';
import { StartTripDto } from './dto/start-trip.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { SmartRouteSearchDto } from './dto/smart-route-search.dto';

@ApiTags('routes')
@Controller('routes')
export class RouteController {
  constructor(
    private routeService: RouteService,
    private tripService: TripService,
    private routeMatchingService: RouteMatchingService,
  ) {}

  @Post('find')
  @ApiOperation({ summary: 'Find routes between two locations' })
  async findRoutes(@Body() findRoutesDto: FindRoutesDto) {
    return this.routeService.findRoutes(findRoutesDto);
  }

  @Post('search/smart')
  @ApiOperation({ summary: 'Smart route search with coordinates or addresses' })
  async smartRouteSearch(@Body() dto: SmartRouteSearchDto) {
    let startLat: number, startLng: number, endLat: number, endLng: number;

    // Geocode start if address provided
    if (dto.startAddress) {
      const coords = await this.routeMatchingService.geocodeAddress(dto.startAddress);
      if (!coords) {
        return {
          success: false,
          message: 'Could not find start location',
        };
      }
      startLat = coords.lat;
      startLng = coords.lng;
    } else if (dto.startLat !== undefined && dto.startLng !== undefined) {
      startLat = dto.startLat;
      startLng = dto.startLng;
    } else {
      return {
        success: false,
        message: 'Start location is required (either address or coordinates)',
      };
    }

    // Geocode end if address provided
    if (dto.endAddress) {
      const coords = await this.routeMatchingService.geocodeAddress(dto.endAddress);
      if (!coords) {
        return {
          success: false,
          message: 'Could not find end location',
        };
      }
      endLat = coords.lat;
      endLng = coords.lng;
    } else if (dto.endLat !== undefined && dto.endLng !== undefined) {
      endLat = dto.endLat;
      endLng = dto.endLng;
    } else {
      return {
        success: false,
        message: 'End location is required (either address or coordinates)',
      };
    }

    const result = await this.routeMatchingService.findSmartRoutes(
      startLat,
      startLng,
      endLat,
      endLng,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular routes' })
  async getPopularRoutes(@Query('city') city?: string, @Query('limit') limit?: number) {
    return this.routeService.getPopularRoutes(city, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by ID' })
  async getRouteById(@Param('id') id: string) {
    return this.routeService.getRouteById(id);
  }

  // ============================================
  // TRIP MANAGEMENT ENDPOINTS
  // ============================================

  @Post('trips/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a new trip' })
  async startTrip(@CurrentUser() user: User, @Body() dto: StartTripDto) {
    const trip = await this.tripService.startTrip(user.id, dto.routeId, {
      lat: dto.currentLat,
      lng: dto.currentLng,
    });

    return {
      success: true,
      data: { trip },
      message: 'Trip started successfully',
    };
  }

  @Get('trips/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active trip' })
  async getActiveTrip(@CurrentUser() user: User) {
    const trip = await this.tripService.getActiveTrip(user.id);

    return {
      success: true,
      data: { trip },
    };
  }

  @Patch('trips/:tripId/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trip location and get progress' })
  async updateTripLocation(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const progress = await this.tripService.updateLocation(tripId, user.id, dto);

    return {
      success: true,
      data: { progress },
    };
  }

  @Post('trips/:tripId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a trip (arrives at destination)' })
  async completeTrip(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    const trip = await this.tripService.completeTrip(tripId, user.id);

    return {
      success: true,
      data: { trip },
      message: 'Trip completed successfully. Check your email for trip summary.',
    };
  }

  @Post('trips/:tripId/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'End trip manually (stops trip before reaching destination)',
    description:
      'Use this when user wants to end the trip midway without completing the full route',
  })
  async endTrip(@CurrentUser() user: User, @Param('tripId') tripId: string) {
    const trip = await this.tripService.endTrip(tripId, user.id);

    return {
      success: true,
      data: { trip },
      message: 'Trip ended. A summary has been sent to your email.',
    };
  }

  @Post('trips/:tripId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel a trip with optional reason',
    description:
      'Cancel an active trip. Provide a reason for better tracking. Email notification will be sent.',
  })
  async cancelTrip(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
    @Body('reason') reason?: string,
  ) {
    const trip = await this.tripService.cancelTrip(tripId, user.id, reason);

    return {
      success: true,
      data: { trip },
      message: 'Trip cancelled. A confirmation has been sent to your email.',
    };
  }

  @Get('trips/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trip history' })
  async getTripHistory(@CurrentUser() user: User, @Query('limit') limit?: number) {
    const trips = await this.tripService.getTripHistory(user.id, limit);

    return {
      success: true,
      data: { trips },
    };
  }

  @Get('trips/statistics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trip statistics for user' })
  async getTripStatistics(@CurrentUser() user: User) {
    const stats = await this.tripService.getTripStatistics(user.id);

    return {
      success: true,
      data: stats,
    };
  }

  // ============================================
  // GEOCODING ENDPOINTS
  // ============================================

  @Get('geocode/search')
  @ApiOperation({ summary: 'Geocode an address' })
  async geocode(@Query('address') address: string) {
    const coords = await this.routeMatchingService.geocodeAddress(address);

    if (!coords) {
      return {
        success: false,
        message: 'Location not found',
      };
    }

    return {
      success: true,
      data: { coordinates: coords },
    };
  }

  @Post('search/street-level')
  @ApiOperation({ summary: 'Find route with street-level guidance for off-road destinations' })
  async streetLevelSearch(@Body() dto: SmartRouteSearchDto) {
    let startLat: number, startLng: number, endLat: number, endLng: number;

    // Geocode start if address provided
    if (dto.startAddress) {
      const coords = await this.routeMatchingService.geocodeAddress(dto.startAddress);
      if (!coords) {
        return {
          success: false,
          message: 'Could not find start location',
        };
      }
      startLat = coords.lat;
      startLng = coords.lng;
    } else if (dto.startLat !== undefined && dto.startLng !== undefined) {
      startLat = dto.startLat;
      startLng = dto.startLng;
    } else {
      return {
        success: false,
        message: 'Start location is required (either address or coordinates)',
      };
    }

    // Geocode end if address provided
    if (dto.endAddress) {
      const coords = await this.routeMatchingService.geocodeAddress(dto.endAddress);
      if (!coords) {
        return {
          success: false,
          message: 'Could not find end location',
        };
      }
      endLat = coords.lat;
      endLng = coords.lng;
    } else if (dto.endLat !== undefined && dto.endLng !== undefined) {
      endLat = dto.endLat;
      endLng = dto.endLng;
    } else {
      return {
        success: false,
        message: 'End location is required (either address or coordinates)',
      };
    }

    const result = await this.routeMatchingService.findRouteWithStreetLevelGuidance(
      startLat,
      startLng,
      endLat,
      endLng,
      dto.endAddress || 'destination',
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('geocode/reverse')
  @ApiOperation({ summary: 'Reverse geocode coordinates' })
  async reverseGeocode(@Query('lat') lat: number, @Query('lng') lng: number) {
    const address = await this.routeMatchingService.reverseGeocode(lat, lng);

    if (!address) {
      return {
        success: false,
        message: 'Address not found',
      };
    }

    return {
      success: true,
      data: { address },
    };
  }
}
