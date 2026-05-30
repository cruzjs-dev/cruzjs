/**
 * Cloudflare KV Cache Binding
 *
 * Wraps Cloudflare KV (or in-memory facade) behind CacheBinding interface.
 */

import type { CacheBinding } from '@cruzjs/core/runtime';

type StoredEntry = {
  value: string;
  expiration?: number;
  metadata?: unknown;
};

/**
 * In-memory KV facade for local development
 */
class InMemoryKV {
  private store = new Map<string, StoredEntry>();

  private isExpired(entry: StoredEntry): boolean {
    if (!entry.expiration) return false;
    return Date.now() / 1000 > entry.expiration;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    let expiration: number | undefined;
    if (options?.expirationTtl) {
      expiration = Math.floor(Date.now() / 1000) + options.expirationTtl;
    }
    this.store.set(key, { value, expiration });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor: string;
  }> {
    const prefix = options?.prefix ?? '';
    const limit = options?.limit ?? 1000;
    const cursorStart = options?.cursor ? parseInt(options.cursor, 10) : 0;

    const matching: { name: string }[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
        continue;
      }
      if (key.startsWith(prefix)) {
        matching.push({ name: key });
      }
    }
    matching.sort((a, b) => a.name.localeCompare(b.name));
    const page = matching.slice(cursorStart, cursorStart + limit);
    const done = cursorStart + limit >= matching.length;
    return {
      keys: page,
      list_complete: done,
      cursor: done ? '' : String(cursorStart + limit),
    };
  }
}

export class CloudflareCacheBinding implements CacheBinding {
  private readonly keyPrefix: string;
  private kv: any; // KVNamespace or InMemoryKV

  constructor(kvNamespace: unknown | null, keyPrefix: string = 'app') {
    this.keyPrefix = keyPrefix;
    this.kv = kvNamespace ?? new InMemoryKV();
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  async get<T = string>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(this.buildKey(key));
      if (value === null) return null;
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

  async set(
    key: string,
    value: string | number | object,
    ttlSeconds?: number,
  ): Promise<boolean> {
    try {
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      const options: any = {};
      if (ttlSeconds !== undefined) options.expirationTtl = ttlSeconds;
      await this.kv.put(this.buildKey(key), stringValue, options);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.kv.delete(this.buildKey(key));
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (await this.delete(key)) deleted++;
    }
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.kv.get(this.buildKey(key));
      return value !== null;
    } catch {
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const prefixedPattern = this.buildKey(pattern.replace('*', ''));
      const list = await this.kv.list({ prefix: prefixedPattern });
      return list.keys.map((key: { name: string }) =>
        key.name.replace(`${this.keyPrefix}:`, ''),
      );
    } catch {
      return [];
    }
  }

  async clear(): Promise<number> {
    const allKeys = await this.keys('');
    return this.deleteMany(allKeys);
  }

  async increment(key: string, by = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current ?? 0) + by;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, by = 1): Promise<number> {
    return this.increment(key, -by);
  }
}
