// src/modules/admin/services/admin-management.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, AdminRole } from '../entities/admin.entity';
import { CreateAdminDto } from '../dto/create-admin.dto';
import * as crypto from 'crypto';

@Injectable()
export class AdminManagementService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  async createAdmin(createAdminDto: CreateAdminDto, currentAdmin: Admin) {
    const { email, firstName, lastName, role = AdminRole.ADMIN } = createAdminDto;

    // Only super admins can create admins
    if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
      throw new ConflictException('Only super administrators can create admin accounts');
    }

    // Validate email domain
    if (!email.toLowerCase().endsWith('@avigate.co')) {
      throw new ConflictException('Email must be from @avigate.co domain');
    }

    // Check if admin exists
    const existingAdmin = await this.adminRepository.findOne({ where: { email } });
    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists');
    }

    // Generate temporary password
    const tempPassword = this.generateSecurePassword(16);

    // Get default permissions for role
    const permissions = this.getRolePermissions(role);

    // Create admin
    const admin = this.adminRepository.create({
      email,
      firstName,
      lastName,
      passwordHash: tempPassword,
      role,
      permissions,
      isActive: true,
      createdBy: currentAdmin.id,
      lastModifiedBy: currentAdmin.id,
    });

    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin created successfully',
      data: { admin, tempPassword },
    };
  }

  private generateSecurePassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    
    return password;
  }

  private getRolePermissions(role: AdminRole): string[] {
    const permissions = {
      [AdminRole.ANALYST]: [
        'users.view',
        'analytics.view',
        'reports.generate',
      ],
      [AdminRole.MODERATOR]: [
        'users.view',
        'users.edit',
        'content.moderate',
        'analytics.view',
      ],
      [AdminRole.ADMIN]: [
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'analytics.view',
        'analytics.export',
        'content.moderate',
      ],
      [AdminRole.SUPER_ADMIN]: ['*'], // All permissions
    };

    return permissions[role] || [];
  }
  async getAdminById(adminId: string) {
  const admin = await this.adminRepository.findOne({
    where: { id: adminId },
    relations: ['creator'],
  });

  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  return {
    success: true,
    data: { admin },
  };
}

async toggleAdminStatus(
  adminId: string,
  isActive: boolean,
  currentAdmin: Admin,
) {
  if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
    throw new ForbiddenException('Only super admins can change admin status');
  }

  const admin = await this.adminRepository.findOne({ where: { id: adminId } });

  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  if (adminId === currentAdmin.id) {
    throw new BadRequestException('Cannot change your own status');
  }

  admin.isActive = isActive;
  await this.adminRepository.save(admin);

  return {
    success: true,
    message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: { admin },
  };
}

async restoreAdmin(adminId: string, currentAdmin: Admin) {
  if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
    throw new ForbiddenException('Only super admins can restore admins');
  }

  const admin = await this.adminRepository.findOne({
    where: { id: adminId },
    withDeleted: true,
  });

  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  if (!admin.deletedAt) {
    throw new BadRequestException('Admin is not deleted');
  }

  admin.deletedAt = null;
  admin.deletedBy = null;
  admin.isActive = true;
  await this.adminRepository.save(admin);

  return {
    success: true,
    message: 'Admin restored successfully',
    data: { admin },
  };
}

async getAdminSessions(adminId: string) {
  // This would use your session manager
  const sessions = await this.adminSessionManager.getAdminSessions(adminId);

  return {
    success: true,
    data: { sessions },
  };
}

async revokeAllSessions(adminId: string, currentAdmin: Admin) {
  const removedCount = await this.adminSessionManager.removeAllAdminSessions(adminId);

  return {
    success: true,
    message: `Revoked ${removedCount} sessions`,
    data: { removedCount },
  };
}

async getRolesAndPermissions() {
  return {
    success: true,
    data: {
      roles: Object.values(AdminRole),
      permissions: this.getPermissionsList(),
      rolePermissions: {
        [AdminRole.SUPER_ADMIN]: this.getRolePermissions(AdminRole.SUPER_ADMIN),
        [AdminRole.ADMIN]: this.getRolePermissions(AdminRole.ADMIN),
        [AdminRole.MODERATOR]: this.getRolePermissions(AdminRole.MODERATOR),
        [AdminRole.ANALYST]: this.getRolePermissions(AdminRole.ANALYST),
      },
    },
  };
}

async resetAdminPassword(
  adminId: string,
  sendEmail: boolean,
  currentAdmin: Admin,
) {
  const admin = await this.adminRepository.findOne({ where: { id: adminId } });

  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  const newPassword = this.generateSecurePassword(16);
  admin.passwordHash = newPassword;
  admin.mustChangePassword = true;
  await this.adminRepository.save(admin);

  if (sendEmail) {
    // Send email with new password
    await this.emailService.sendPasswordResetEmail(...)
  }

  return {
    success: true,
    message: 'Password reset successfully',
    data: { tempPassword: newPassword },
  };
}
}