// src/modules/admin/controllers/admin-auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminTotpService } from '../services/admin-totp.service';
import { AdminPasswordService } from '../services/admin-password.service';
import { AdminInvitationService } from '../services/admin-invitation.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';
import { CurrentSession } from '@/common/decorators/current-session.decorator';
import { Admin } from '../entities/admin.entity';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { VerifyTotpDto } from '../dto/verify-totp.dto';
import { DisableTotpDto } from '../dto/disable-totp.dto';
import { RegenerateBackupCodesDto } from '../dto/regenerate-backup-codes.dto';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private adminAuthService: AdminAuthService,
    private adminTotpService: AdminTotpService,
    private adminPasswordService: AdminPasswordService,
    private adminInvitationService: AdminInvitationService,
  ) {}

  // ==================== AUTHENTICATION ====================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login with optional 2FA',
    description: 'Login with email/password. If 2FA is enabled, provide totpToken or backupCode.',
  })
  async login(
    @Body() loginDto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.adminAuthService.login(loginDto, req, res);
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin logout' })
  async logout(
    @CurrentAdmin() admin: Admin,
    @CurrentSession() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.adminAuthService.logout(admin, sessionId, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Uses refresh token from HTTP-only cookie',
  })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.admin_refresh_token;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return this.adminAuthService.refreshToken(refreshToken, req, res);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  async getProfile(@CurrentAdmin() admin: Admin) {
    return this.adminAuthService.getProfile(admin);
  }

  // ==================== PASSWORD MANAGEMENT ====================

  @Post('password/request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Public endpoint. Sends reset email if account exists.',
  })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.adminPasswordService.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Public endpoint. Resets password using token from email.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminPasswordService.resetPassword(
      dto.token,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  @Post('password/change')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Authenticated endpoint. Change your own password.',
  })
  async changePassword(
    @CurrentAdmin() admin: Admin,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.adminPasswordService.changePassword(
      admin,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  // ==================== INVITATION ====================

  @Post('invitation/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept admin invitation',
    description: 'Public endpoint. New admins use this to set their password.',
  })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.adminInvitationService.acceptInvitation(dto);
  }

  // ==================== TOTP (2FA) MANAGEMENT ====================

  @Post('totp/generate-secret')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate TOTP secret (Step 1 of 2FA setup)',
    description: 'Generates QR code and backup codes. Save backup codes securely!',
  })
  async generateTotpSecret(@CurrentAdmin() admin: Admin) {
    return this.adminTotpService.generateSecret(admin);
  }

  @Post('totp/enable')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable TOTP (Step 2 of 2FA setup)',
    description: 'Verify TOTP token to enable 2FA',
  })
  async enableTotp(
    @CurrentAdmin() admin: Admin,
    @Body() dto: VerifyTotpDto,
  ) {
    return this.adminTotpService.enableTotp(admin, dto.totpToken);
  }

  @Post('totp/disable')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable TOTP 2FA',
    description: 'Requires password and TOTP token',
  })
  async disableTotp(
    @CurrentAdmin() admin: Admin,
    @Body() dto: DisableTotpDto,
  ) {
    return this.adminTotpService.disableTotp(
      admin,
      dto.currentPassword,
      dto.totpToken,
    );
  }

  @Get('totp/status')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get TOTP status',
    description: 'Returns TOTP enabled status and remaining backup codes',
  })
  async getTotpStatus(@CurrentAdmin() admin: Admin) {
    return this.adminTotpService.getTotpStatus(admin);
  }

  @Post('totp/regenerate-backup-codes')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description: 'Requires password and TOTP token. Save new codes securely!',
  })
  async regenerateBackupCodes(
    @CurrentAdmin() admin: Admin,
    @Body() dto: RegenerateBackupCodesDto,
  ) {
    return this.adminTotpService.regenerateBackupCodes(
      admin,
      dto.currentPassword,
      dto.totpToken,
    );
  }
}