// src/modules/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminManagementController } from './controllers/admin-management.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminManagementService } from './services/admin-management.service';
import { AnalyticsService } from './services/analytics.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { Admin } from './entities/admin.entity';
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP } from '../user/entities/user-otp.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User, UserDevice, UserOTP]),
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
    EmailModule,
  ],
  controllers: [
    AdminAuthController,
    AdminManagementController,
    UserManagementController,
    AnalyticsController,
  ],
  providers: [
    AdminAuthService,
    AdminManagementService,
    AnalyticsService,
    AdminJwtStrategy,
  ],
  exports: [AdminAuthService],
})
export class AdminModule {}