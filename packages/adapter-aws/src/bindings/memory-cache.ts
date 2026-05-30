import type { CacheBinding } from '@cruzjs/core/runtime';

/**
 * In-memory cache binding for AWS environments.
 *
 * For production, you'd swap this for Redis (ElastiCache) or DynamoDB.
 * This implementation works for Lambda (short-lived) and as a dev fallback.
 */
export class MemoryCacheBinding implements CacheBinding {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private readonly keyPrefix: string;

  constructor(namespace: string = 'app') {
    this.keyPrefix = namespace;
  }

  private fullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private isExpired(entry: { expiresAt?: number }): boolean {
    return !!entry.expiresAt && Date.now() > entry.expiresAt;
  }

  async get<T = string>(key: string): Promise<T | null> {
    const entry = this.store.get(this.fullKey(key));
    if (!entry || this.isExpired(entry)) {
      this.store.delete(this.fullKey(key));
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as T;
    }
  }

  async set(
    key: string,
    value: string | number | object,
    ttlSeconds?: number,
  ): Promise<boolean> {
    const stringValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.store.set(this.fullKey(key), {
      value: stringValue,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(this.fullKey(key));
  }

  async deleteMany(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) count++;
    }
    return count;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(this.fullKey(key));
    if (!entry || this.isExpired(entry)) return false;
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = this.fullKey(pattern.replace('*', ''));
    const result: string[] = [];
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
        continue;
      }
      if (key.startsWith(prefix))
        result.push(key.replace(`${this.keyPrefix}:`, ''));
    }
    return result;
  }

  async clear(): Promise<number> {
    const prefix = `${this.keyPrefix}:`;
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
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
