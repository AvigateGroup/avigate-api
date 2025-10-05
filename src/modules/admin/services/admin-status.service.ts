// src/modules/admin/services/admin-status.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, AdminRole } from '../entities/admin.entity';

@Injectable()
export class AdminStatusService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  async toggleAdminStatus(adminId: string, isActive: boolean, currentAdmin: Admin) {
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
    admin.lastModifiedBy = currentAdmin.id;
    await this.adminRepository.save(admin);

    // Use the correct property names from the Admin entity
    const {
      passwordHash,
      totpSecret,
      totpBackupCodes,
      inviteToken,
      resetToken,
      refreshToken,
      passwordHistory,
      ...sanitizedAdmin
    } = admin;

    return {
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { admin: sanitizedAdmin },
    };
  }
}
