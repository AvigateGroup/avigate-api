// src/modules/auth/auth.controller.ts

import { Controller, Post, Body, UseGuards, Req, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from '../user/dto/register.dto';
import { RequestLoginOtpDto } from '../user/dto/request-login-otp.dto';
import { VerifyLoginOtpDto } from '../user/dto/verify-login-otp.dto';
import { ResendLoginOtpDto } from '../user/dto/resend-login-otp.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { RefreshTokenDto } from '../user/dto/refresh-token.dto';
import { GoogleAuthDto } from '../user/dto/google-auth.dto';
import { CapturePhoneDto } from '../user/dto/capture-phone.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user ' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, req);
  }

  @Post('login/request-otp')
  @ApiOperation({
    summary: 'Step 1: Request login OTP',
    description: 'Sends OTP to email for login',
  })
  async requestLoginOtp(@Body() requestLoginOtpDto: RequestLoginOtpDto, @Req() req: Request) {
    return this.authService.requestLoginOtp(requestLoginOtpDto, req);
  }

  @Post('login/verify-otp')
  @ApiOperation({
    summary: 'Step 2: Verify OTP and complete login',
    description: 'Verifies the OTP code sent to email and returns access tokens',
  })
  async verifyLoginOtp(@Body() verifyLoginOtpDto: VerifyLoginOtpDto, @Req() req: Request) {
    return this.authService.verifyLoginOtp(verifyLoginOtpDto, req);
  }

  @Post('login/resend-otp')
  @ApiOperation({
    summary: 'Resend login OTP',
    description: "Resends a new OTP code to the user's email. Previous OTPs will be invalidated.",
  })
  async resendLoginOtp(@Body() resendLoginOtpDto: ResendLoginOtpDto, @Req() req: Request) {
    return this.authService.resendLoginOtp(resendLoginOtpDto.email, req);
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
