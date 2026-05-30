import type { CacheBinding } from '@cruzjs/core/runtime';

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
    const sv =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.store.set(this.fullKey(key), {
      value: sv,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(this.fullKey(key));
  }

  async deleteMany(keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (await this.delete(k)) count++;
    }
    return count;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(this.fullKey(key));
    return !!entry && !this.isExpired(entry);
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = this.fullKey(pattern.replace('*', ''));
    const results: string[] = [];
    for (const [k, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(k);
        continue;
      }
      if (k.startsWith(prefix)) {
        results.push(k.replace(`${this.keyPrefix}:`, ''));
      }
    }
    return results;
  }

  async clear(): Promise<number> {
    const keys = await this.keys('');
    return this.deleteMany(keys);
  }

  async increment(key: string, by = 1): Promise<number> {
    const current = await this.get<number>(key);
    const next = (current ?? 0) + by;
    await this.set(key, next);
    return next;
  }

  async decrement(key: string, by = 1): Promise<number> {
    return this.increment(key, -by);
  }
}
