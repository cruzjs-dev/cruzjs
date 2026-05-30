import type { ITaggedCache } from './cache.interface';

/**
 * Minimal interface for the cache-service methods that TaggedCache delegates to.
 *
 * Both KVCacheService and CacheService satisfy this contract so TaggedCache
 * works identically for both backends.
 */
type CacheBackend = {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  flushTag(tag: string): Promise<number>;
  addKeyToTags(key: string, tags: string[]): Promise<void>;
};

/**
 * A tagged-cache handle.
 *
 * Keys written through this handle are automatically tracked under the
 * supplied tags.  Calling `flush()` invalidates every key associated with
 * *any* of the handle's tags.
 *
 * Usage:
 * ```ts
 * const tagged = cache.tags(['users', 'permissions']);
 * await tagged.set('user:1', userData, 300);
 * const user = await tagged.get<User>('user:1');
 * await tagged.flush(); // busts all keys tagged with "users" OR "permissions"
 * ```
 */
export class TaggedCache implements ITaggedCache {
  constructor(
    private readonly backend: CacheBackend,
    private readonly tagNames: string[],
  ) {}

  /** Get a value from cache */
  async get<T = string>(key: string): Promise<T | null> {
    return this.backend.get<T>(key);
  }

  /** Set a value in cache and record the key under each of this handle's tags */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const ok = await this.backend.set(key, value, ttlSeconds);
    if (ok) {
      await this.backend.addKeyToTags(key, this.tagNames);
    }
    return ok;
  }

  /** Delete all cache keys associated with any of this handle's tags */
  async flush(): Promise<number> {
    let total = 0;
    for (const tag of this.tagNames) {
      total += await this.backend.flushTag(tag);
    }
    return total;
  }
}
