// src/modules/auth/auth.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegistrationService } from './services/registration.service';
import { LoginService } from './services/login.service';
import { VerificationService } from './services/verification.service';
import { OtpLoginService } from './services/otp-login.service';
import { GoogleAuthService } from './services/google-auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { TokenService } from './services/token.service';
import { DeviceService } from './services/device.service';
import { OtpService } from './services/otp.service';
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP } from '../user/entities/user-otp.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserEmailService } from '../email/user-email.service';
import { UserUpdatesEmailService } from '../email/user-updates-email.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDevice, UserOTP]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RegistrationService,
    LoginService,
    VerificationService,
    OtpLoginService,
    GoogleAuthService,
    PasswordResetService,
    TokenService,
    DeviceService,
    OtpService,
    JwtStrategy,
    GoogleStrategy,
    UserEmailService,
    UserUpdatesEmailService,
  ],
  exports: [
    AuthService, 
    JwtStrategy, 
    PassportModule, 
    JwtModule,
    VerificationService, 
    TokenService, 
    OtpService,
  ],
})
export class AuthModule {}