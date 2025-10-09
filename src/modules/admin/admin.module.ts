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

// Services - Analytics
import { AnalyticsService } from './services/analytics.service';

// Strategies
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

// Entities
import { Admin } from './entities/admin.entity';
import { AdminSession } from './entities/admin-session.entity';
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP } from '../user/entities/user-otp.entity';

// Modules
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminSession, User, UserDevice, UserOTP]),
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
  ],
  controllers: [
    AdminAuthController,
    AdminManagementController,
    UserManagementController,
    AnalyticsController,
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
  ],
  exports: [
    AdminAuthService,
    AdminTotpService,
    AdminPasswordService,
    AdminSessionManagerService,
    AdminCrudService,
    AdminPermissionService,
  ],
})
export class AdminModule {}
