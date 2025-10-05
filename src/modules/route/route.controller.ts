// src/modules/route/route.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RouteService } from './route.service';
import { FindRoutesDto } from './dto/find-routes.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('routes')
@Controller('routes')
export class RouteController {
  constructor(private routeService: RouteService) {}

  @Post('find')
  @ApiOperation({ summary: 'Find routes between two locations' })
  async findRoutes(@Body() findRoutesDto: FindRoutesDto) {
    return this.routeService.findRoutes(findRoutesDto);
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
}
