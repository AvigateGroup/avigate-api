// src/modules/auth/auth.service.ts 

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP } from '../user/entities/user-otp.entity';
import { RegisterDto } from '../user/dto/register.dto';
import { LoginDto } from '../user/dto/login.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { RequestLoginOtpDto } from '../user/dto/login-with-otp.dto';
import { VerifyLoginOtpDto } from '../user/dto/verify-login-otp.dto';
import { GoogleAuthDto } from '../user/dto/google-auth.dto';
import { CapturePhoneDto } from '../user/dto/capture-phone.dto';
import { ForgotPasswordDto } from '../user/dto/forgot-password.dto';
import { ResetPasswordDto } from '../user/dto/reset-password.dto';
import { RegistrationService } from './services/registration.service';
import { LoginService } from './services/login.service';
import { VerificationService } from './services/verification.service';
import { OtpLoginService } from './services/otp-login.service';
import { GoogleAuthService } from './services/google-auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { TokenService } from './services/token.service';
import { DeviceService } from './services/device.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private registrationService: RegistrationService,
    private loginService: LoginService,
    private verificationService: VerificationService,
    private otpLoginService: OtpLoginService,
    private googleAuthService: GoogleAuthService,
    private passwordResetService: PasswordResetService,
    private tokenService: TokenService,
    private deviceService: DeviceService,
  ) {}

  async register(registerDto: RegisterDto, req: Request) {
    return this.registrationService.register(registerDto, req);
  }

  async login(loginDto: LoginDto, req: Request) {
    return this.loginService.login(loginDto, req);
  }

  async requestLoginOtp(requestLoginOtpDto: RequestLoginOtpDto, req: Request) {
    return this.otpLoginService.requestLoginOtp(requestLoginOtpDto, req);
  }

  async verifyLoginOtp(verifyLoginOtpDto: VerifyLoginOtpDto, req: Request) {
    return this.otpLoginService.verifyLoginOtp(verifyLoginOtpDto, req);
  }

  async googleAuth(googleAuthDto: GoogleAuthDto, req: Request) {
    return this.googleAuthService.googleAuth(googleAuthDto, req);
  }

  async capturePhoneNumber(user: User, capturePhoneDto: CapturePhoneDto) {
    return this.googleAuthService.capturePhoneNumber(user, capturePhoneDto);
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto, req: Request) {
    return this.verificationService.verifyEmail(verifyEmailDto, req);
  }

  async resendVerification(email: string, req: Request) {
    return this.verificationService.resendVerification(email, req);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, req: Request) {
    return this.passwordResetService.forgotPassword(forgotPasswordDto, req);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(resetPasswordDto);
  }

  async refreshToken(refreshToken: string) {
    return this.tokenService.refreshToken(refreshToken);
  }

  async logout(user: User, fcmToken?: string) {
    return this.tokenService.logout(user, fcmToken);
  }
}