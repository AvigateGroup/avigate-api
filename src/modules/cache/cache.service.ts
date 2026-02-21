// src/modules/cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { logger } from '@/utils/logger.util';

export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  journeyId?: string;
}

@Injectable()
export class CacheService {
  private readonly LOCATION_TTL = 300; // 5 minutes
  private readonly LOCATION_PREFIX = 'user:location:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  // Helper method for cache-aside pattern
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Store user location in Redis
   */
  async setUserLocation(location: UserLocation): Promise<void> {
    const key = `${this.LOCATION_PREFIX}${location.userId}`;
    await this.set(key, location, this.LOCATION_TTL);
    logger.debug('User location cached', { userId: location.userId, key });
  }

  /**
   * Get user's current location from Redis
   */
  async getUserLocation(userId: string): Promise<UserLocation | null> {
    const key = `${this.LOCATION_PREFIX}${userId}`;
    const location = await this.get<UserLocation>(key);

    if (!location) {
      logger.debug('User location not found in cache', { userId, key });
      return null;
    }

    return location;
  }

  /**
   * Delete user location from Redis
   */
  async deleteUserLocation(userId: string): Promise<void> {
    const key = `${this.LOCATION_PREFIX}${userId}`;
    await this.del(key);
    logger.debug('User location removed from cache', { userId, key });
  }

  /**
   * Store active journey tracking
   */
  async setActiveJourney(userId: string, journeyId: string): Promise<void> {
    const key = `user:journey:${userId}`;
    await this.set(key, journeyId, 3600); // 1 hour TTL
  }

  /**
   * Get active journey for user
   */
  async getActiveJourney(userId: string): Promise<string | null> {
    const key = `user:journey:${userId}`;
    return (await this.get<string>(key)) || null;
  }

  /**
   * Delete active journey
   */
  async deleteActiveJourney(userId: string): Promise<void> {
    const key = `user:journey:${userId}`;
    await this.del(key);
  }

  /**
   * Store journey tracking interval ID
   */
  async setTrackingInterval(journeyId: string, intervalId: string): Promise<void> {
    const key = `journey:tracking:${journeyId}`;
    await this.set(key, intervalId, 7200); // 2 hours TTL
  }

  /**
   * Get journey tracking interval ID
   */
  async getTrackingInterval(journeyId: string): Promise<string | null> {
    const key = `journey:tracking:${journeyId}`;
    return (await this.get<string>(key)) || null;
  }

  /**
   * Delete journey tracking interval
   */
  async deleteTrackingInterval(journeyId: string): Promise<void> {
    const key = `journey:tracking:${journeyId}`;
    await this.del(key);
  }
}
