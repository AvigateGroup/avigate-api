// src/modules/auth/auth.controller.ts

import { Controller, Post, Body, UseGuards, Req, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from '../user/dto/register.dto';
import { LoginDto } from '../user/dto/login.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { RefreshTokenDto } from '../user/dto/refresh-token.dto';
import { RequestLoginOtpDto } from '../user/dto/login-with-otp.dto';
import { VerifyLoginOtpDto } from '../user/dto/verify-login-otp.dto';
import { GoogleAuthDto } from '../user/dto/google-auth.dto';
import { CapturePhoneDto } from '../user/dto/capture-phone.dto';
import { ForgotPasswordDto } from '../user/dto/forgot-password.dto';
import { ResetPasswordDto } from '../user/dto/reset-password.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, req);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user with password' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req);
  }

  @Post('login/request-otp')
  @ApiOperation({ summary: 'Request OTP for login' })
  async requestLoginOtp(@Body() requestLoginOtpDto: RequestLoginOtpDto, @Req() req: Request) {
    return this.authService.requestLoginOtp(requestLoginOtpDto, req);
  }

  @Post('login/verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login' })
  async verifyLoginOtp(@Body() verifyLoginOtpDto: VerifyLoginOtpDto, @Req() req: Request) {
    return this.authService.verifyLoginOtp(verifyLoginOtpDto, req);
  }

  @Post('google')
  @ApiOperation({ summary: 'Google OAuth authentication' })
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto, @Req() req: Request) {
    return this.authService.googleAuth(googleAuthDto, req);
  }

  @Put('capture-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture phone number for Google users' })
  async capturePhoneNumber(@CurrentUser() user: User, @Body() capturePhoneDto: CapturePhoneDto) {
    return this.authService.capturePhoneNumber(user, capturePhoneDto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with OTP' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto, @Req() req: Request) {
    return this.authService.verifyEmail(verifyEmailDto, req);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  async resendVerification(@Body('email') email: string, @Req() req: Request) {
    return this.authService.resendVerification(email, req);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(forgotPasswordDto, req);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(@CurrentUser() user: User, @Body('fcmToken') fcmToken?: string) {
    return this.authService.logout(user, fcmToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return { success: true, data: { user } };
  }
}