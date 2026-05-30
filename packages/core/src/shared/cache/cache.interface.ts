/**
 * A tagged-cache handle returned by `cache.tags(...)`.
 *
 * Every key written through this handle is tracked under the given tags so
 * that a single `flush()` call invalidates them all.
 */
export interface ITaggedCache {
  /** Get a tagged value from cache */
  get<T = string>(key: string): Promise<T | null>;

  /** Set a tagged value in cache with optional TTL */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;

  /** Delete all cache keys associated with any of this handle's tags */
  flush(): Promise<number>;
}

/**
 * Shared cache service interface
 * Implemented by both KVCacheService (Cloudflare KV) and CacheService (Redis)
 */
export interface ICacheService {
  /** Get the key prefix for this cache service instance */
  getPrefix(): string;

  /** Get a value from cache */
  get<T = string>(key: string): Promise<T | null>;

  /** Set a value in cache with optional TTL */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;

  /** Delete a key from cache */
  delete(key: string): Promise<boolean>;

  /**
   * Delete a single key from cache (alias for `delete`)
   */
  forget(key: string): Promise<boolean>;

  /** Delete multiple keys from cache */
  deleteMany(keys: string[]): Promise<number>;

  /** Check if a key exists */
  exists(key: string): Promise<boolean>;

  /** Get all keys matching a pattern */
  keys(pattern: string): Promise<string[]>;

  /** Clear all keys with the current prefix */
  clear(): Promise<number>;

  /**
   * Clear all keys with the current prefix (alias for `clear`)
   */
  flush(): Promise<number>;

  /** Increment a numeric value */
  increment(key: string, by?: number): Promise<number>;

  /** Decrement a numeric value */
  decrement(key: string, by?: number): Promise<number>;

  /**
   * Get a value from cache, or compute and store it if missing
   * @param key - Cache key
   * @param ttlSeconds - Time to live in seconds
   * @param callback - Function to compute the value on cache miss
   */
  remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>): Promise<T>;

  /**
   * Get a value from cache, or compute and store it forever (no TTL)
   * @param key - Cache key
   * @param callback - Function to compute the value on cache miss
   */
  rememberForever<T>(key: string, callback: () => Promise<T>): Promise<T>;

  /**
   * Get a value from cache with tag tracking, or compute and store it if missing
   * @param key - Cache key
   * @param ttlSeconds - Time to live in seconds
   * @param tags - Tags to associate with this cache entry
   * @param callback - Function to compute the value on cache miss
   */
  rememberTagged<T>(
    key: string,
    ttlSeconds: number,
    tags: string[],
    callback: () => Promise<T>
  ): Promise<T>;

  /**
   * Flush all cache keys associated with a tag
   * @returns Number of keys deleted
   */
  flushTag(tag: string): Promise<number>;

  /**
   * Returns a tagged-cache handle for the given tag names.
   *
   * Single tag shorthand: `cache.tags('users')`
   * Multiple tags:        `cache.tags(['users', 'posts'])`
   */
  tags(tagNames: string | string[]): ITaggedCache;
}
