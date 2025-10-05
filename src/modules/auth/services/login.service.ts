//src/modules/auth/services/login.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../user/entities/user.entity';
import { LoginDto } from '../../user/dto/login.dto';
import { UserEmailService } from '../../email/user-email.service';
import { TokenService } from './token.service';
import { DeviceService } from './device.service';
import { OtpService } from './otp.service';
import { OTPType } from '../../user/entities/user-otp.entity';

@Injectable()
export class LoginService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userEmailService: UserEmailService,
    private tokenService: TokenService,
    private deviceService: DeviceService,
    private otpService: OtpService,
  ) {}

  async login(loginDto: LoginDto, req: Request) {
    const { email, password, fcmToken, deviceInfo } = loginDto;

    const user = await this.findAndValidateUser(email, password);

    if (!user.isTestAccount && !user.isVerified) {
      return this.handleUnverifiedUser(user, req);
    }

    const tokens = this.tokenService.generateTokens(user);

    await this.updateUserLoginInfo(user, tokens);

    if (fcmToken) {
      await this.deviceService.updateOrCreateDevice(user.id, fcmToken, req, deviceInfo);
    }

    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: fullUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  private async findAndValidateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'passwordHash',
        'firstName',
        'lastName',
        'isVerified',
        'isActive',
        'isTestAccount',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async handleUnverifiedUser(user: User, req: Request) {
    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.EMAIL_VERIFICATION,
      req.ip,
    );

    await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

    return {
      success: false,
      message: 'Email not verified. A new verification code has been sent to your email.',
      data: {
        userId: user.id,
        email: user.email,
        requiresVerification: true,
      },
    };
  }

  private async updateUserLoginInfo(
    user: User,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
  }
}
