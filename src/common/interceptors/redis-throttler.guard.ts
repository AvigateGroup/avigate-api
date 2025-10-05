// src/common/guards/redis-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheService } from '@/modules/cache/cache.service';

@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  constructor(
    private cacheService: CacheService,
    ...args: ConstructorParameters<typeof ThrottlerGuard>
  ) {
    super(...args);
  }

  async handleRequest(
    context: any,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);

    const current = await this.cacheService.get<number>(key) || 0;

    if (current >= limit) {
      throw new Error('Too many requests');
    }

    await this.cacheService.set(key, current + 1, ttl);
    return true;
  }

  protected generateKey(request: any): string {
    const userId = request.user?.id || 'anonymous';
    const ip = request.ip;
    const endpoint = request.route?.path || request.url;
    return `throttle:${userId}:${ip}:${endpoint}`;
  }
}
