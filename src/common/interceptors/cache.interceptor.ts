// src/common/interceptors/cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '@/modules/cache/cache.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());

    if (!cacheKey) {
      return next.handle();
    }

    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    const request = context.switchToHttp().getRequest();
    const fullKey = `${cacheKey}:${JSON.stringify(request.params)}:${JSON.stringify(request.query)}`;

    const cachedValue = await this.cacheService.get(fullKey);
    if (cachedValue) {
      return of(cachedValue);
    }

    return next.handle().pipe(
      tap(async response => {
        await this.cacheService.set(fullKey, response, ttl);
      }),
    );
  }
}
