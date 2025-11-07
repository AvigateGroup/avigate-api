// src/modules/route/route.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStep } from './entities/route-step.entity';
import { FindRoutesDto } from './dto/find-routes.dto';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteStep)
    private routeStepRepository: Repository<RouteStep>,
  ) {}

  async findRoutes(findRoutesDto: FindRoutesDto) {
    const { startLocationId, endLocationId } = findRoutesDto;

    const routes = await this.routeRepository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.startLocation', 'startLocation')
      .leftJoinAndSelect('route.endLocation', 'endLocation')
      .leftJoinAndSelect('route.steps', 'steps')
      .where('route.startLocationId = :startLocationId', { startLocationId })
      .andWhere('route.endLocationId = :endLocationId', { endLocationId })
      .andWhere('route.isActive = :isActive', { isActive: true })
      .orderBy('route.popularityScore', 'DESC')
      .addOrderBy('route.estimatedDuration', 'ASC')
      .limit(5)
      .getMany();

    return {
      success: true,
      data: {
        routes,
        count: routes.length,
      },
    };
  }

  async getRouteById(id: string) {
    const route = await this.routeRepository.findOne({
      where: { id, isActive: true },
      relations: ['startLocation', 'endLocation', 'steps'],
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Sort steps by order
    route.steps.sort((a, b) => a.stepOrder - b.stepOrder);

    return {
      success: true,
      data: { route },
    };
  }

  async getPopularRoutes(city?: string, limit: number = 20) {
    const query = this.routeRepository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.startLocation', 'startLocation')
      .leftJoinAndSelect('route.endLocation', 'endLocation')
      .where('route.isActive = :isActive', { isActive: true })
      .andWhere('route.isVerified = :isVerified', { isVerified: true });

    if (city) {
      query.andWhere('startLocation.city = :city', { city });
    }

    const routes = await query.orderBy('route.popularityScore', 'DESC').take(limit).getMany();

    return {
      success: true,
      data: { routes },
    };
  }
}
