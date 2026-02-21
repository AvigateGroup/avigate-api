// src/modules/route/route.module.ts (UPDATED WITH REFACTORED SERVICES)
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
import { IntelligentRouteService } from './services/intelligent-route.service';
import { IntermediateStopHandlerService } from './services/intermediate-stop-handler.service';
import { SmartStopMatchingService } from './services/smart-stop-matching.service';
import { FinalDestinationHandlerService } from './services/final-destination-handler.service';
import { BidirectionalRouteService } from './services/bidirectional-route.service';
import { LocationFinderService } from './services/location-finder.service';
import { InstructionGeneratorService } from './services/instruction-generator.service';
import { RouteDataAnalyzerService } from './services/route-data-analyzer.service';
import { WalkingRouteService } from './services/walking-route.service';
import { TripGateway } from './gateways/trip.gateway';
import { Route } from './entities/route.entity';
import { RouteStep } from './entities/route-step.entity';
import { RouteSegment } from './entities/route-segment.entity';
import { ActiveTrip } from './entities/active-trip.entity';
import { Location } from '../location/entities/location.entity';
import { Landmark } from '../location/entities/landmark.entity';
import { User } from '../user/entities/user.entity';
import { LocationModule } from '../location/location.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Route,
      RouteStep,
      RouteSegment,
      ActiveTrip,
      Location,
      Landmark,
      User,
    ]),
    ConfigModule,
    JwtModule.register({}),
    LocationModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [RouteController],
  providers: [
    // Existing services
    RouteService,
    TripService,
    GoogleMapsService,
    GeofencingService,
    RouteMatchingService,
    IntelligentRouteService,
    IntermediateStopHandlerService,
    SmartStopMatchingService,
    FinalDestinationHandlerService,
    TripGateway,

    // Refactored modular services
    BidirectionalRouteService,
    LocationFinderService,
    InstructionGeneratorService,
    RouteDataAnalyzerService,
    WalkingRouteService,
  ],
  exports: [
    // Existing exports
    RouteService,
    TripService,
    GoogleMapsService,
    GeofencingService,
    RouteMatchingService,
    IntelligentRouteService,
    IntermediateStopHandlerService,
    SmartStopMatchingService,
    FinalDestinationHandlerService,

    //Export refactored services (available for other modules)
    BidirectionalRouteService,
    LocationFinderService,
    InstructionGeneratorService,
    RouteDataAnalyzerService,
    WalkingRouteService,
  ],
})
export class RouteModule {}
