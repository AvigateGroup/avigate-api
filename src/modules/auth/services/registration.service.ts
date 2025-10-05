import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User, UserSex } from '../../user/entities/user.entity';
import { UserOTP, OTPType } from '../../user/entities/user-otp.entity';
import { RegisterDto } from '../../user/dto/register.dto';
import { UserEmailService } from '../../email/user-email.service';
import { TokenService } from './token.service';
import { DeviceService } from './device.service';
import { OtpService } from './otp.service';
import { TEST_ACCOUNTS } from '@/config/test-accounts.config';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private userEmailService: UserEmailService,
    private tokenService: TokenService,
    private deviceService: DeviceService,
    private otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto, req: Request) {
    const { email, password, firstName, lastName, sex, phoneNumber, fcmToken, deviceInfo } =
      registerDto;

    await this.validateNewUser(email, phoneNumber);

    const isTestAccount = TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());

    const user = await this.createUser({
      email,
      password,
      firstName,
      lastName,
      sex,
      phoneNumber,
      isTestAccount,
    });

    if (isTestAccount) {
      return this.handleTestAccountRegistration(user, req, fcmToken, deviceInfo);
    }

    return this.handleNormalRegistration(user, req, fcmToken, deviceInfo);
  }

  private async validateNewUser(email: string, phoneNumber: string) {
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === email
          ? 'User with this email already exists'
          : 'User with this phone number already exists',
      );
    }
  }

  private async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    sex: UserSex;
    phoneNumber: string;
    isTestAccount: boolean;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: data.email,
      passwordHash: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      sex: data.sex,
      phoneNumber: data.phoneNumber,
      preferredLanguage: 'English',
      isVerified: data.isTestAccount,
      isTestAccount: data.isTestAccount,
      reputationScore: 100,
      totalContributions: 0,
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  private async handleTestAccountRegistration(
    user: User,
    req: Request,
    fcmToken?: string,
    deviceInfo?: string,
  ) {
    const tokens = this.tokenService.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.save(user);

    if (fcmToken) {
      await this.deviceService.registerDevice(user.id, fcmToken, req, deviceInfo, true);
    }

    return {
      success: true,
      message: 'Test account registration successful',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isTestAccount: true,
      },
    };
  }

  private async handleNormalRegistration(
    user: User,
    req: Request,
    fcmToken?: string,
    deviceInfo?: string,
  ) {
    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.EMAIL_VERIFICATION,
      req.ip,
    );

    if (fcmToken) {
      await this.deviceService.registerDevice(user.id, fcmToken, req, deviceInfo, false);
    }

    await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

    return {
      success: true,
      message: 'Registration successful. Please verify your email to continue.',
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        requiresVerification: true,
      },
    };
  }
}
