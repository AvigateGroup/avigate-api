// src/modules/route/route.module.ts (UPDATED WITH EMAIL SERVICE)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { TripService } from './services/trip.service';
import { GoogleMapsService } from './services/google-maps.service';
import { GeofencingService } from './services/geofencing.service';
import { RouteMatchingService } from './services/route-matching.service';
import { TripGateway } from './gateways/trip.gateway';
import { Route } from './entities/route.entity';
import { RouteStep } from './entities/route-step.entity';
import { ActiveTrip } from './entities/active-trip.entity';
import { Location } from '../location/entities/location.entity';
import { User } from '../user/entities/user.entity';
import { LocationModule } from '../location/location.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteStep, ActiveTrip, Location, User]),
    ConfigModule,
    JwtModule.register({}),
    LocationModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [RouteController],
  providers: [
    RouteService,
    TripService,
    GoogleMapsService,
    GeofencingService,
    RouteMatchingService,
    TripGateway,
  ],
  exports: [RouteService, TripService, GoogleMapsService, GeofencingService, RouteMatchingService],
})
export class RouteModule {}
