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

    @Post('totp/setup')
    @UseGuards(AdminAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate TOTP secret for 2FA setup' })
    async setupTOTP(@CurrentAdmin() admin: Admin) {
    return this.adminAuthService.setupTOTP(admin);
    }

    @Post('totp/verify')
    @UseGuards(AdminAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify and enable TOTP 2FA' })
    async verifyTOTP(
    @CurrentAdmin() admin: Admin,
    @Body('totpToken') totpToken: string,
    ) {
    return this.adminAuthService.verifyAndEnableTOTP(admin, totpToken);
    }

    @Post('totp/disable')
    @UseGuards(AdminAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Disable TOTP 2FA' })
    async disableTOTP(
    @CurrentAdmin() admin: Admin,
    @Body('password') password: string,
    ) {
    return this.adminAuthService.disableTOTP(admin, password);
    }

    @Post('totp/backup-codes/regenerate')
    @UseGuards(AdminAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Regenerate TOTP backup codes' })
    async regenerateBackupCodes(@CurrentAdmin() admin: Admin) {
    return this.adminAuthService.regenerateBackupCodes(admin);
    }
}
