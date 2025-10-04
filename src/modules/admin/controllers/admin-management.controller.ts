// src/modules/admin/controllers/admin-management.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';
import { Admin } from '../entities/admin.entity';
import { AdminManagementService } from '../services/admin-management.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';

@ApiTags('admin')
@Controller('admin/management')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminManagementController {
  constructor(private adminManagementService: AdminManagementService) {}

  @Post('create')
  @RequirePermissions('admins.create')
  @ApiOperation({ summary: 'Create new admin (Super Admin only)' })
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.createAdmin(createAdminDto, currentAdmin);
  }

  @Get()
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get all admins' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAdmins(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @CurrentAdmin() currentAdmin?: Admin,
  ) {
    return this.adminManagementService.getAdmins(
      Number(page),
      Number(limit),
      role,
      status,
      search,
    );
  }

  @Get(':adminId')
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get admin by ID' })
  async getAdminById(@Param('adminId') adminId: string) {
    return this.adminManagementService.getAdminById(adminId);
  }

  @Put(':adminId')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Update admin' })
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.updateAdmin(
      adminId,
      updateAdminDto,
      currentAdmin,
    );
  }

  @Delete(':adminId')
  @RequirePermissions('admins.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete admin (soft delete)' })
  async deleteAdmin(
    @Param('adminId') adminId: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.deleteAdmin(adminId, currentAdmin);
  }

  @Put(':adminId/restore')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Restore deleted admin' })
  async restoreAdmin(
    @Param('adminId') adminId: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.restoreAdmin(adminId, currentAdmin);
  }

  @Put(':adminId/activate')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Activate/Deactivate admin' })
  async toggleAdminStatus(
    @Param('adminId') adminId: string,
    @Body('isActive') isActive: boolean,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.toggleAdminStatus(
      adminId,
      isActive,
      currentAdmin,
    );
  }

  @Get(':adminId/sessions')
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get admin active sessions' })
  async getAdminSessions(@Param('adminId') adminId: string) {
    return this.adminManagementService.getAdminSessions(adminId);
  }

  @Delete(':adminId/sessions')
  @RequirePermissions('admins.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all admin sessions' })
  async revokeAdminSessions(
    @Param('adminId') adminId: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.revokeAllSessions(adminId, currentAdmin);
  }

  @Get('roles/permissions')
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get available roles and permissions' })
  async getRolesAndPermissions() {
    return this.adminManagementService.getRolesAndPermissions();
  }

  @Post(':adminId/reset-password')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Reset admin password' })
  async resetAdminPassword(
    @Param('adminId') adminId: string,
    @Body('sendEmail') sendEmail: boolean = true,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminManagementService.resetAdminPassword(
      adminId,
      sendEmail,
      currentAdmin,
    );
  }
}
