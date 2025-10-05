// src/modules/admin/services/admin-session.service.ts

import { 
  Injectable, 
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, AdminRole } from '../entities/admin.entity';
import { AdminSessionManagerService } from './admin-session-manager.service';

@Injectable()
export class AdminSessionService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private adminSessionManager: AdminSessionManagerService,
  ) {}

  async getAdminSessions(adminId: string) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const sessions = await this.adminSessionManager.getAdminSessions(adminId);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      location: session.location,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));

    return {
      success: true,
      data: { 
        sessions: formattedSessions,
        total: formattedSessions.length,
      },
    };
  }

  async revokeAllSessions(adminId: string, currentAdmin: Admin) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (currentAdmin.role !== AdminRole.SUPER_ADMIN && currentAdmin.id !== adminId) {
      throw new ForbiddenException('Insufficient permissions to revoke sessions');
    }

    const removedCount = await this.adminSessionManager.removeAllAdminSessions(adminId);

    return {
      success: true,
      message: `Revoked ${removedCount} session(s)`,
      data: { removedCount },
    };
  }

  async revokeSession(sessionId: string, currentAdmin: Admin) {
  const session = await this.adminSessionManager.getSession(sessionId);
  
  if (!session) {
    throw new NotFoundException('Session not found');
  }

  if (currentAdmin.role !== AdminRole.SUPER_ADMIN && currentAdmin.id !== session.adminId) {
    throw new ForbiddenException('Insufficient permissions to revoke this session');
  }

  await this.adminSessionManager.revokeSession(sessionId);

  return {
    success: true,
    message: 'Session revoked successfully',
  };
}
}