import { injectable } from 'inversify';
import { CloudflareContext } from './context';
import type { ICacheService, ITaggedCache } from '../cache/cache.interface';
import { TaggedCache } from '../cache/tagged-cache';

type CacheKey = string;
type CacheValue = string | number | object;

/**
 * Build the internal KV key used to store a tag's key list.
 */
function tagKey(tag: string): string {
  return `_tags:${tag}`;
}

/**
 * Cloudflare KV Cache Service
 * Provides Redis-like caching operations using Cloudflare KV
 *
 * The KV namespace is automatically retrieved from the Cloudflare context
 * which is set at the start of each request by the worker.
 */
@injectable()
export class KVCacheService implements ICacheService {
  private readonly keyPrefix: string;

  constructor(keyPrefix = 'app') {
    this.keyPrefix = keyPrefix;
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
  private buildKey(key: CacheKey): string {
    return `${this.keyPrefix}:${key}`;
  }

  /**
   * Get KV namespace from context
   */
  private getKV(): KVNamespace | null {
    return CloudflareContext.kv;
  }

  /**
   * Get a value from cache
   */
  async get<T = string>(key: CacheKey): Promise<T | null> {
    try {
      const kv = this.getKV();
      if (!kv) {
        // KV not available - return null (cache miss)
        return null;
      }
      const value = await kv.get(this.buildKey(key));
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
    key: CacheKey,
    value: CacheValue,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const kv = this.getKV();
      if (!kv) {
        // KV not available - silently skip (cache won't persist but app continues)
        console.warn('KV namespace not available - cache set skipped');
        return false;
      }
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      const options: KVNamespacePutOptions = {};
      if (ttlSeconds !== undefined) {
        options.expirationTtl = ttlSeconds;
      }

      await kv.put(this.buildKey(key), stringValue, options);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: CacheKey): Promise<boolean> {
    try {
      const kv = this.getKV();
      if (!kv) {
        return false;
      }
      await kv.delete(this.buildKey(key));
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a single key from cache (alias for `delete`)
   */
  async forget(key: CacheKey): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: CacheKey[]): Promise<number> {
    try {
      const kv = this.getKV();
      if (!kv) {
        return 0;
      }
      let deleted = 0;
      for (const key of keys) {
        await kv.delete(this.buildKey(key));
        deleted++;
      }
      return deleted;
    } catch (error) {
      console.error(`Cache deleteMany error:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   * Note: KV doesn't have a native exists operation, so we fetch the value
   */
  async exists(key: CacheKey): Promise<boolean> {
    try {
      const kv = this.getKV();
      if (!kv) {
        return false;
      }
      const value = await kv.get(this.buildKey(key));
      return value !== null;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all keys matching a pattern (prefix only in KV)
   * Note: KV list is limited - this returns keys with the given prefix
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const kv = this.getKV();
      if (!kv) {
        return [];
      }
      const prefixedPattern = this.buildKey(pattern.replace('*', ''));
      const list = await kv.list({ prefix: prefixedPattern });
      // Remove prefix from returned keys
      return list.keys.map((key) => key.name.replace(`${this.keyPrefix}:`, ''));
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear all keys with the current prefix
   * Note: This is expensive in KV - use sparingly
   */
  async clear(): Promise<number> {
    try {
      const keys = await this.keys('');
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

  /**
   * Increment a numeric value
   * Note: KV doesn't support atomic increment, this is not atomic
   */
  async increment(key: CacheKey, by = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current ?? 0) + by;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Decrement a numeric value
   * Note: KV doesn't support atomic decrement, this is not atomic
   */
  async decrement(key: CacheKey, by = 1): Promise<number> {
    return this.increment(key, -by);
  }

  // ---------------------------------------------------------------------------
  // remember / tagged cache invalidation
  // ---------------------------------------------------------------------------

  /**
   * Get a value from cache, or compute and store it on miss
   */
  async remember<T>(
    key: CacheKey,
    ttlSeconds: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value as CacheValue, ttlSeconds);
    return value;
  }

  /**
   * Get a value from cache, or compute and store it forever (no TTL)
   */
  async rememberForever<T>(
    key: CacheKey,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value as CacheValue);
    return value;
  }

  /**
   * Get a value from cache with tag tracking, or compute and store it on miss
   */
  async rememberTagged<T>(
    key: CacheKey,
    ttlSeconds: number,
    tags: string[],
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value as CacheValue, ttlSeconds);
    await this.addKeyToTags(key, tags);
    return value;
  }

  /**
   * Flush all cache keys associated with a tag
   */
  async flushTag(tag: string): Promise<number> {
    try {
      const kv = this.getKV();
      if (!kv) {
        return 0;
      }

      const tagListKey = this.buildKey(tagKey(tag));
      const raw = await kv.get(tagListKey);
      if (!raw) {
        return 0;
      }

      const keys: string[] = JSON.parse(raw);
      // Delete all tagged cache keys
      for (const k of keys) {
        await kv.delete(this.buildKey(k));
      }
      // Delete the tag list itself
      await kv.delete(tagListKey);

      return keys.length;
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
   * Add a cache key to one or more tag lists in KV.
   * Each tag is stored as `_tags:{tagName}` → JSON array of cache keys.
   */
  addKeyToTags(key: CacheKey, tags: string[]): Promise<void> {
    return this._addKeyToTags(key, tags);
  }

  private async _addKeyToTags(key: CacheKey, tags: string[]): Promise<void> {
    const kv = this.getKV();
    if (!kv) {
      return;
    }

    for (const tag of tags) {
      const tagListKey = this.buildKey(tagKey(tag));
      const raw = await kv.get(tagListKey);
      const existing: string[] = raw ? JSON.parse(raw) : [];

      if (!existing.includes(key)) {
        existing.push(key);
      }

      await kv.put(tagListKey, JSON.stringify(existing));
    }
  }
}

/**
 * Factory for creating KV cache service instances with different prefixes
 * KV namespace is automatically retrieved from the Cloudflare context
 */
@injectable()
export class KVCacheServiceFactory {
  /**
   * Create a KVCacheService instance with the specified prefix
   * The KV namespace will be retrieved from context when cache operations are called
   */
  create(prefix: string): KVCacheService {
    return new KVCacheService(prefix);
  }
}
