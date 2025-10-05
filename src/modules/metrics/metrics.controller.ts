// src/modules/metrics/metrics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MetricsController {
  @Get('performance')
  @RequirePermissions('system.health')
  async getPerformanceMetrics() {
    return {
      success: true,
      data: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
      },
    };
  }
}