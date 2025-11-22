// src/modules/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminManagementController } from './controllers/admin-management.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AdminController } from './controllers/admin.controller';

// Services - Auth & Security
import { AdminAuthService } from './services/admin-auth.service';
import { AdminTotpService } from './services/admin-totp.service';
import { AdminPasswordService } from './services/admin-password.service';
import { AdminInvitationService } from './services/admin-invitation.service';

// Services - Management
import { AdminCrudService } from './services/admin-crud.service';
import { AdminStatusService } from './services/admin-status.service';
import { AdminPermissionService } from './services/admin-permission.service';
import { AdminSessionService } from './services/admin-session.service';
import { AdminSessionManagerService } from './services/admin-session-manager.service';
import { AdminSessionCleanupService } from './services/admin-session-cleanup.service';

// Services - Analytics & Fare Management
import { AnalyticsService } from './services/analytics.service';
import { FareAdjustmentService } from './services/fare-adjustment.service';
import { ContributionManagementService } from './services/contribution-management.service';

// Strategies
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

// Entities - Admin
import { Admin } from './entities/admin.entity';
import { AdminSession } from './entities/admin-session.entity';

// Entities - User
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP } from '../user/entities/user-otp.entity';

// Entities - Route & Location
import { Route } from '../route/entities/route.entity';
import { RouteSegment } from '../route/entities/route-segment.entity';
import { RouteStep } from '../route/entities/route-step.entity';
import { Location } from '../location/entities/location.entity';

// Entities - Fare
import { FareHistory } from '../fare/entities/fare-history.entity';
import { FareRule } from '../fare/entities/fare-rule.entity';

// Entities - Community
import { RouteContribution } from '../community/entities/route-contribution.entity';

// Modules
import { EmailModule } from '../email/email.module';
import { ReputationModule } from '../reputation/reputation.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Admin entities
      Admin,
      AdminSession,
      // User entities
      User,
      UserDevice,
      UserOTP,
      // Route & Location entities
      Route,
      RouteSegment,
      RouteStep,
      Location,
      // Fare entities
      FareHistory,
      FareRule,
      // Community entities
      RouteContribution,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('ADMIN_JWT_EXPIRATION', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(), // For session cleanup cron job
    EmailModule,
    ReputationModule,
    NotificationsModule,
  ],
  controllers: [
    AdminAuthController,
    AdminManagementController,
    UserManagementController,
    AnalyticsController,
    AdminController,
  ],
  providers: [
    // Auth & Strategy
    AdminAuthService,
    AdminJwtStrategy,

    // Security Services
    AdminTotpService,
    AdminPasswordService,
    AdminInvitationService,

    // Admin Management Services
    AdminCrudService,
    AdminStatusService,
    AdminPermissionService,
    AdminSessionService,
    AdminSessionManagerService,
    AdminSessionCleanupService,

    // Analytics
    AnalyticsService,

    // Fare & Contribution Management
    FareAdjustmentService,
    ContributionManagementService,
  ],
  exports: [
    AdminAuthService,
    AdminTotpService,
    AdminPasswordService,
    AdminSessionManagerService,
    AdminCrudService,
    AdminPermissionService,
    FareAdjustmentService,
    ContributionManagementService,
  ],
})
export class AdminModule {}
