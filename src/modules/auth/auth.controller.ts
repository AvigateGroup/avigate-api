// src/modules/auth/auth.controller.ts (continued)
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from '../user/dto/register.dto';
import { LoginDto } from '../user/dto/login.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { RefreshTokenDto } from '../user/dto/refresh-token.dto';
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
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req);
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
