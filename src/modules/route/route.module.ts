// src/modules/route/route.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { Route } from './entities/route.entity';
import { RouteStep } from './entities/route-step.entity';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [TypeOrmModule.forFeature([Route, RouteStep]), LocationModule],
  controllers: [RouteController],
  providers: [RouteService],
  exports: [RouteService],
})
export class RouteModule {}
