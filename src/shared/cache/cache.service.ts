import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('database.redis.url');
    const redisToken = this.configService.get<string>('database.redis.token');

    if (redisUrl && redisToken) {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      this.logger.log('Redis connection initialized');
    } else {
      this.logger.warn('Redis credentials not configured, caching disabled');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      return value as T;
    } catch (error) {
      // Only log error if it's not a network/fetch error (which might be temporary)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for key ${key}, skipping cache`);
      } else {
        this.logger.error(`Error getting cache key ${key}:`, error);
      }
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    expirationInSeconds?: number,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      if (expirationInSeconds) {
        await this.redis.setex(key, expirationInSeconds, JSON.stringify(value));
      } else {
        await this.redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      // Only log error if it's not a network/fetch error (which might be temporary)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for key ${key}, skipping cache`);
      } else {
        this.logger.error(`Error setting cache key ${key}:`, error);
      }
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      // Only log error if it's not a network/fetch error (which might be temporary)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for key ${key}, skipping cache deletion`);
      } else {
        this.logger.error(`Error deleting cache key ${key}:`, error);
      }
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys matching ${pattern}`);
      }
    } catch (error) {
      // Only log error if it's not a network/fetch error (which might be temporary)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for pattern ${pattern}, skipping cache invalidation`);
      } else {
        this.logger.error(`Error invalidating cache pattern ${pattern}:`, error);
      }
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      return await this.redis.incr(key);
    } catch (error) {
      // Only log error if it's not a network/fetch error (which might be temporary)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for key ${key}, skipping increment`);
      } else {
        this.logger.error(`Error incrementing cache key ${key}:`, error);
      }
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      // Only log error if it's not a network/fetch error (which might be temporary)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for key ${key}, skipping expiration`);
      } else {
        this.logger.error(`Error setting expiration for key ${key}:`, error);
      }
    }
  }

  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    if (!this.redis) return true; // Allow if Redis is not configured

    const key = `ratelimit:${identifier}`;

    try {
      const current = await this.incr(key);

      if (current === 1) {
        await this.expire(key, windowSeconds);
      }

      return current <= maxRequests;
    } catch (error) {
      // If it's a network error, allow the request (fail open)
      if (error instanceof Error && error.message.includes('fetch failed')) {
        this.logger.warn(`Cache connection issue for rate limit ${identifier}, allowing request`);
      } else {
        this.logger.error(`Error checking rate limit for ${identifier}:`, error);
      }
      return true; // Allow on error (fail open)
    }
  }
}
