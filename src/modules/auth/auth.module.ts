
// ============================================
// FILE 8: src/modules/auth/auth.module.ts (UPDATED)
// ============================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP } from '../user/entities/user-otp.entity';
import { EmailModule } from '../email/email.module';

// Import new services
import { RegistrationService } from './services/registration.service';
import { LoginService } from './services/login.service';
import { VerificationService } from './services/verification.service';
import { TokenService } from './services/token.service';
import { DeviceService } from './services/device.service';
import { OtpService } from './services/otp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDevice, UserOTP]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    RegistrationService,
    LoginService,
    VerificationService,
    TokenService,
    DeviceService,
    OtpService,
  ],
  exports: [AuthService],
})
export class AuthModule {}