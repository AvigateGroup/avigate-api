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
import { AdminCrudService } from '../services/admin-crud.service';
import { AdminStatusService } from '../services/admin-status.service';
import { AdminPasswordService } from '../services/admin-password.service';
import { AdminPermissionService } from '../services/admin-permission.service';
import { AdminSessionService } from '../services/admin-session.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';

@ApiTags('admin')
@Controller('admin/management')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminManagementController {
  constructor(
    private adminCrudService: AdminCrudService,
    private adminStatusService: AdminStatusService,
    private adminPasswordService: AdminPasswordService,
    private adminPermissionService: AdminPermissionService,
    private adminSessionService: AdminSessionService,
  ) {}

  @Post('create')
  @RequirePermissions('admins.create')
  @ApiOperation({ summary: 'Create new admin (Super Admin only)' })
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminCrudService.createAdmin(createAdminDto, currentAdmin);
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
    return this.adminCrudService.getAdmins(
      Number(page),
      Number(limit),
      role,
      status,
      search,
    );
  }

  @Get('roles/permissions')
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get available roles and permissions' })
  async getRolesAndPermissions() {
    return this.adminPermissionService.getRolesAndPermissions();
  }

  @Get(':adminId')
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get admin by ID' })
  async getAdminById(@Param('adminId') adminId: string) {
    return this.adminCrudService.getAdminById(adminId);
  }

  @Put(':adminId')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Update admin' })
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminCrudService.updateAdmin(
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
    return this.adminCrudService.deleteAdmin(adminId, currentAdmin);
  }

  @Put(':adminId/restore')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Restore deleted admin' })
  async restoreAdmin(
    @Param('adminId') adminId: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminCrudService.restoreAdmin(adminId, currentAdmin);
  }

  @Put(':adminId/activate')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Activate/Deactivate admin' })
  async toggleAdminStatus(
    @Param('adminId') adminId: string,
    @Body('isActive') isActive: boolean,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminStatusService.toggleAdminStatus(
      adminId,
      isActive,
      currentAdmin,
    );
  }

  @Post(':adminId/reset-password')
  @RequirePermissions('admins.edit')
  @ApiOperation({ summary: 'Reset admin password' })
  async resetAdminPassword(
    @Param('adminId') adminId: string,
    @Body('sendEmail') sendEmail: boolean = true,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminPasswordService.resetAdminPassword(
      adminId,
      sendEmail,
      currentAdmin,
    );
  }

  @Get(':adminId/sessions')
  @RequirePermissions('admins.view')
  @ApiOperation({ summary: 'Get admin active sessions' })
  async getAdminSessions(@Param('adminId') adminId: string) {
    return this.adminSessionService.getAdminSessions(adminId);
  }

  @Delete(':adminId/sessions')
  @RequirePermissions('admins.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all admin sessions' })
  async revokeAdminSessions(
    @Param('adminId') adminId: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminSessionService.revokeAllSessions(adminId, currentAdmin);
  }

  @Delete(':adminId/sessions/:sessionId')
  @RequirePermissions('admins.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke specific admin session' })
  async revokeAdminSession(
    @Param('adminId') adminId: string,
    @Param('sessionId') sessionId: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminSessionService.revokeSession(sessionId, currentAdmin);
  }
}
