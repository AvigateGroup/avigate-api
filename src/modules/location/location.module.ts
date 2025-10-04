// src/modules/location/location.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { Location } from './entities/location.entity';
import { Landmark } from './entities/landmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location, Landmark])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}