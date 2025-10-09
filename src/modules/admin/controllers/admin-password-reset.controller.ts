// src/modules/admin/controllers/admin-password-reset.controller.ts
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminPasswordService } from '../services/admin-password.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';
import { Admin } from '../entities/admin.entity';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';

@ApiTags('admin')
@Controller('admin/password')
export class AdminPasswordResetController {
  constructor(private passwordService: AdminPasswordService) {}

  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.passwordService.requestPasswordReset(dto.email);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto.token, dto.newPassword, dto.confirmPassword);
  }

  @Post('change')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  async changePassword(@CurrentAdmin() admin: Admin, @Body() dto: ChangePasswordDto) {
    return this.passwordService.changePassword(
      admin,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }
}
