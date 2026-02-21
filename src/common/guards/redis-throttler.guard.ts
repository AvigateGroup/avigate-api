// src/common/guards/redis-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { CacheService } from '@/modules/cache/cache.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  constructor(
    private readonly cacheService: CacheService,
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || 'unknown';
    const endpoint = req.route?.path || req.url;
    return `throttle:${userId}:${ip}:${endpoint}`;
  }

  protected async storageIncrement(key: string, ttl: number): Promise<number> {
    const current = (await this.cacheService.get<number>(key)) || 0;
    const newValue = current + 1;
    await this.cacheService.set(key, newValue, ttl);
    return newValue;
  }
}
