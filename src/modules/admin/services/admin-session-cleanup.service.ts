// src/modules/admin/services/admin-session-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminSessionManagerService } from './admin-session-manager.service';

@Injectable()
export class AdminSessionCleanupService {
  private readonly logger = new Logger(AdminSessionCleanupService.name);

  constructor(
    private adminSessionManager: AdminSessionManagerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSessionCleanup() {
    this.logger.log('Starting expired admin session cleanup...');
    
    try {
      const deletedCount = await this.adminSessionManager.cleanupExpiredSessions();
      this.logger.log(`Cleaned up ${deletedCount} expired admin sessions`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error);
    }
  }
}