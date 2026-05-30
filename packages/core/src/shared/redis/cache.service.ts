import { inject, injectable } from 'inversify';
import type { RedisClient } from './redis.types';
import { RedisService } from './redis.service';
import type { ICacheService, ITaggedCache } from '../cache/cache.interface';
import { TaggedCache } from '../cache/tagged-cache';

type RedisValue = string | number | Buffer;
type RedisKey = string;

/**
 * Build the internal Redis key used for a tag set.
 */
function tagSetKey(tag: string): string {
  return `tag:${tag}`;
}

/**
 * Redis cache service with helper functions
 * Provides get/set/delete operations with TTL support and key prefixing
 * Note: For Cloudflare environments, use KVCacheService instead
 */
@injectable()
export class CacheService implements ICacheService {
  private redis: RedisClient | null = null;
  private readonly keyPrefix: string;
  private readonly redisService: RedisService;

  constructor(
    @inject(RedisService) redisService: RedisService,
    keyPrefix = 'app'
  ) {
    this.redisService = redisService;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Get or initialize the Redis client
   */
  private async getRedis(): Promise<RedisClient> {
    if (!this.redis) {
      this.redis = await this.redisService.getClientAsync();
    }
    return this.redis;
  }

  /**
   * Get the key prefix for this cache service instance
   */
  getPrefix(): string {
    return this.keyPrefix;
  }

  /**
   * Build a namespaced key with prefix
   */
  private buildKey(key: RedisKey): string {
    return `${this.keyPrefix}:${key}`;
  }

  /**
   * Get a value from cache
   */
  async get<T = string>(key: RedisKey): Promise<T | null> {
    try {
      const redis = await this.getRedis();
      const value = await redis.get(this.buildKey(key));
      if (value === null) {
        return null;
      }
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key - Cache key
   * @param value - Value to store (will be JSON stringified if object)
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  async set(
    key: RedisKey,
    value: RedisValue | object,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (ttlSeconds !== undefined) {
        await redis.setex(this.buildKey(key), ttlSeconds, stringValue);
      } else {
        await redis.set(this.buildKey(key), stringValue);
      }
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: RedisKey): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const result = await redis.del(this.buildKey(key));
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a single key from cache (alias for `delete`)
   */
  async forget(key: RedisKey): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: RedisKey[]): Promise<number> {
    try {
      if (keys.length === 0) {
        return 0;
      }
      const redis = await this.getRedis();
      const prefixedKeys = keys.map((key) => this.buildKey(key));
      const result = await redis.del(...prefixedKeys);
      return result;
    } catch (error) {
      console.error(`Cache deleteMany error:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: RedisKey): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const result = await redis.exists(this.buildKey(key));
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL on an existing key
   */
  async setTTL(key: RedisKey, ttlSeconds: number): Promise<boolean> {
    try {
      const redis = await this.getRedis();
      const result = await redis.expire(this.buildKey(key), ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`Cache setTTL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * Returns -1 if key exists but has no TTL, -2 if key doesn't exist
   */
  async getTTL(key: RedisKey): Promise<number> {
    try {
      const redis = await this.getRedis();
      return await redis.ttl(this.buildKey(key));
    } catch (error) {
      console.error(`Cache getTTL error for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: RedisKey, by = 1): Promise<number> {
    try {
      const redis = await this.getRedis();
      return await redis.incrby(this.buildKey(key), by);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: RedisKey, by = 1): Promise<number> {
    try {
      const redis = await this.getRedis();
      return await redis.decrby(this.buildKey(key), by);
    } catch (error) {
      console.error(`Cache decrement error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const redis = await this.getRedis();
      const prefixedPattern = this.buildKey(pattern);
      const keys = await redis.keys(prefixedPattern);
      // Remove prefix from returned keys
      return keys.map((key: string) => key.replace(`${this.keyPrefix}:`, ''));
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear all keys with the current prefix
   */
  async clear(): Promise<number> {
    try {
      const keys = await this.keys('*');
      if (keys.length === 0) {
        return 0;
      }
      return await this.deleteMany(keys);
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Clear all keys with the current prefix (alias for `clear`)
   */
  async flush(): Promise<number> {
    return this.clear();
  }

  // ---------------------------------------------------------------------------
  // remember / tagged cache invalidation
  // ---------------------------------------------------------------------------

  /**
   * Get a value from cache, or compute and store it on miss
   */
  async remember<T>(
    key: RedisKey,
    ttlSeconds: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value as RedisValue | object, ttlSeconds);
    return value;
  }

  /**
   * Get a value from cache, or compute and store it forever (no TTL)
   */
  async rememberForever<T>(
    key: RedisKey,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value as RedisValue | object);
    return value;
  }

  /**
   * Get a value from cache with tag tracking, or compute and store it on miss
   */
  async rememberTagged<T>(
    key: RedisKey,
    ttlSeconds: number,
    tags: string[],
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value as RedisValue | object, ttlSeconds);
    await this.addKeyToTags(key, tags);
    return value;
  }

  /**
   * Flush all cache keys associated with a tag
   * Uses Redis sets: SMEMBERS to get keys, DEL to remove them + the set
   */
  async flushTag(tag: string): Promise<number> {
    try {
      const redis = await this.getRedis();
      const setKey = this.buildKey(tagSetKey(tag));

      const members = await redis.smembers(setKey);
      if (members.length === 0) {
        return 0;
      }

      // Delete all tagged cache keys + the tag set itself
      const keysToDelete = [
        ...members.map((k) => this.buildKey(k)),
        setKey,
      ];
      const result = await redis.del(...keysToDelete);
      // Subtract 1 for the tag set key itself
      return Math.max(0, result - 1);
    } catch (error) {
      console.error(`Cache flushTag error for tag ${tag}:`, error);
      return 0;
    }
  }

  /**
   * Returns a tagged-cache handle for one or more tag names
   */
  tags(tagNames: string | string[]): ITaggedCache {
    const names = Array.isArray(tagNames) ? tagNames : [tagNames];
    return new TaggedCache(this, names);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Add a cache key to one or more tag sets in Redis via SADD
   */
  addKeyToTags(key: RedisKey, tags: string[]): Promise<void> {
    return this._addKeyToTags(key, tags);
  }

  private async _addKeyToTags(key: RedisKey, tags: string[]): Promise<void> {
    try {
      const redis = await this.getRedis();
      for (const tag of tags) {
        await redis.sadd(this.buildKey(tagSetKey(tag)), key);
      }
    } catch (error) {
      console.error(`Cache addKeyToTags error for key ${key}:`, error);
    }
  }
}

/**
 * Cache service factory
 * Creates CacheService instances with different prefixes
 */
@injectable()
export class CacheServiceFactory {
  constructor(
    @inject(RedisService) private readonly redisService: RedisService
  ) {}

  /**
   * Create a CacheService instance with the specified prefix
   */
  create(prefix: string): CacheService {
    return new CacheService(this.redisService, prefix);
  }
}
