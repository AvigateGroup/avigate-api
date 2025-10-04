// src/modules/admin/controllers/admin-auth.controller.ts
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';
import { Admin } from '../entities/admin.entity';

@ApiTags('admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() loginDto: AdminLoginDto, @Req() req: Request) {
    return this.adminAuthService.login(loginDto, req);
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin logout' })
  async logout(@CurrentAdmin() admin: Admin) {
    return this.adminAuthService.logout(admin);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh admin access token' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.adminAuthService.refreshToken(refreshToken);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  async getProfile(@CurrentAdmin() admin: Admin) {
    return { success: true, data: { admin } };
  }
}