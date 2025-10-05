// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check' })
  ready() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
