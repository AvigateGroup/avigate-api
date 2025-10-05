// src/common/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

export function CacheKey(key: string) {
  return SetMetadata(CACHE_KEY_METADATA, key);
}

export function CacheTTL(ttl: number) {
  return SetMetadata(CACHE_TTL_METADATA, ttl);
}
