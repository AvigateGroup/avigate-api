// src/modules/admin/services/admin-crud.service.ts

import { 
  Injectable, 
  ConflictException, 
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, AdminRole } from '../entities/admin.entity';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminEmailService } from '@/modules/email/admin-email.service';
import { AdminPasswordService } from './admin-password.service';
import { AdminPermissionService } from './admin-permission.service';
import * as crypto from 'crypto';

@Injectable()
export class AdminCrudService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private adminEmailService: AdminEmailService,
    private adminPasswordService: AdminPasswordService,
    private adminPermissionService: AdminPermissionService,
  ) {}

  async createAdmin(createAdminDto: CreateAdminDto, currentAdmin: Admin) {
    const { email, firstName, lastName, role = AdminRole.ADMIN } = createAdminDto;

    // Only super admins can create admins
    if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super administrators can create admin accounts');
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
    const tempPassword = this.adminPasswordService.generateSecurePassword(16);
    const passwordHash = await this.adminPasswordService.hashPassword(tempPassword);

    // Get default permissions for role
    const permissions = this.adminPermissionService.getRolePermissions(role);

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setDate(inviteTokenExpiry.getDate() + 7); // 7 days expiry

    // Create admin
    const admin = this.adminRepository.create({
      email,
      firstName,
      lastName,
      passwordHash,
      role,
      permissions,
      isActive: true,
      mustChangePassword: true,
      inviteToken,
      inviteTokenExpiry,
      createdBy: currentAdmin.id,
      lastModifiedBy: currentAdmin.id,
    });

    await this.adminRepository.save(admin);

    // Send invitation email
    try {
      await this.adminEmailService.sendAdminInvitationEmail(
        email,
        firstName,
        tempPassword,
        inviteToken,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error);
    }

    const { passwordHash: _, ...adminData } = admin;

    return {
      success: true,
      message: 'Admin created successfully. Invitation email sent.',
      data: { admin: adminData, tempPassword },
    };
  }

  async getAdmins(
    page: number = 1,
    limit: number = 50,
    role?: string,
    status?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.adminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.creator', 'creator')
      .leftJoinAndSelect('admin.lastModifier', 'lastModifier');

    if (role) {
      queryBuilder.andWhere('admin.role = :role', { role });
    }

    if (status === 'active') {
      queryBuilder.andWhere('admin.isActive = :isActive', { isActive: true });
    } else if (status === 'inactive') {
      queryBuilder.andWhere('admin.isActive = :isActive', { isActive: false });
    }

    if (search) {
      queryBuilder.andWhere(
        '(admin.firstName ILIKE :search OR admin.lastName ILIKE :search OR admin.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();

    const admins = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('admin.createdAt', 'DESC')
      .getMany();

    const sanitizedAdmins = admins.map(admin => this.sanitizeAdmin(admin));

    return {
      success: true,
      data: {
        admins: sanitizedAdmins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getAdminById(adminId: string) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
      relations: ['creator', 'lastModifier'],
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      success: true,
      data: { admin: this.sanitizeAdmin(admin) },
    };
  }

  async updateAdmin(
    adminId: string,
    updateAdminDto: UpdateAdminDto,
    currentAdmin: Admin,
  ) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Only super admins can update roles and permissions
    if (updateAdminDto.role || updateAdminDto.permissions) {
      if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only super admins can modify roles and permissions');
      }
    }

    // Prevent self-demotion
    if (adminId === currentAdmin.id && updateAdminDto.role && updateAdminDto.role !== currentAdmin.role) {
      throw new BadRequestException('Cannot change your own role');
    }

    if (updateAdminDto.firstName) admin.firstName = updateAdminDto.firstName;
    if (updateAdminDto.lastName) admin.lastName = updateAdminDto.lastName;
    if (updateAdminDto.role) {
      admin.role = updateAdminDto.role;
      admin.permissions = this.adminPermissionService.getRolePermissions(updateAdminDto.role);
    }
    if (updateAdminDto.permissions) admin.permissions = updateAdminDto.permissions;
    if (updateAdminDto.isActive !== undefined) admin.isActive = updateAdminDto.isActive;

    admin.lastModifiedBy = currentAdmin.id;
    admin.updatedAt = new Date();

    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin updated successfully',
      data: { admin: this.sanitizeAdmin(admin) },
    };
  }

  async deleteAdmin(adminId: string, currentAdmin: Admin) {
    if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can delete admins');
    }

    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (adminId === currentAdmin.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    admin.deletedAt = new Date();
    admin.deletedBy = currentAdmin.id;
    admin.isActive = false;

    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin deleted successfully',
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

  // Use TypeORM's restore method
  await this.adminRepository.restore(adminId);

  // Fetch the restored admin
  const restoredAdmin = await this.adminRepository.findOne({
    where: { id: adminId },
  });

  if (!restoredAdmin) {
    throw new NotFoundException('Failed to restore admin');
  }

  restoredAdmin.deletedBy =null;
  restoredAdmin.isActive = true;
  restoredAdmin.lastModifiedBy = currentAdmin.id;
  
  await this.adminRepository.save(restoredAdmin);

  return {
    success: true,
    message: 'Admin restored successfully',
    data: { admin: this.sanitizeAdmin(restoredAdmin) },
  };
}

  private sanitizeAdmin(admin: Admin) {
    const { passwordHash, totpSecret, totpBackupCodes, inviteToken, resetToken, ...sanitized } = admin;
    return sanitized;
  }
}
