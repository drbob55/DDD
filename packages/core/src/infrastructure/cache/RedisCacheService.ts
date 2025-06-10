import { Redis } from 'ioredis';
import { ICacheService } from '../../application/ports/ICacheService';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

export class RedisCacheService implements ICacheService {
  private redis: Redis;
  private defaultTTL: number = 3600; // 1 hour

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.prefixKey(key));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const ttl = options?.ttl || this.defaultTTL;
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    await this.redis.setex(
      this.prefixKey(key),
      ttl,
      data
    );

    // Handle tags for cache invalidation
    if (options?.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await this.redis.sadd(`tag:${tag}`, this.prefixKey(key));
        await this.redis.expire(`tag:${tag}`, ttl);
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.prefixKey(key));
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(this.prefixKey(pattern));
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    const keys = await this.redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      await this.redis.del(`tag:${tag}`);
    }
  }

  async flush(): Promise<void> {
    const keys = await this.redis.keys(this.prefixKey('*'));
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    return this.redis.incrby(this.prefixKey(key), amount);
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.redis.decrby(this.prefixKey(key), amount);
  }

  private prefixKey(key: string): string {
    return `dental:${key}`;
  }
}
