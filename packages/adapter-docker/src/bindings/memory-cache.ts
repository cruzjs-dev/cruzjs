import type { CacheBinding } from '@cruzjs/core/runtime';

export class MemoryCacheBinding implements CacheBinding {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private readonly keyPrefix: string;
  constructor(namespace: string = 'app') { this.keyPrefix = namespace; }
  private fullKey(key: string): string { return `${this.keyPrefix}:${key}`; }
  private isExpired(e: { expiresAt?: number }): boolean { return !!e.expiresAt && Date.now() > e.expiresAt; }
  async get<T = string>(key: string): Promise<T | null> {
    const e = this.store.get(this.fullKey(key));
    if (!e || this.isExpired(e)) { this.store.delete(this.fullKey(key)); return null; }
    try { return JSON.parse(e.value) as T; } catch { return e.value as T; }
  }
  async set(key: string, value: string | number | object, ttlSeconds?: number): Promise<boolean> {
    this.store.set(this.fullKey(key), { value: typeof value === 'object' ? JSON.stringify(value) : String(value), expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
    return true;
  }
  async delete(key: string): Promise<boolean> { return this.store.delete(this.fullKey(key)); }
  async deleteMany(keys: string[]): Promise<number> { let c = 0; for (const k of keys) { if (await this.delete(k)) c++; } return c; }
  async exists(key: string): Promise<boolean> { const e = this.store.get(this.fullKey(key)); return !!e && !this.isExpired(e); }
  async keys(pattern: string): Promise<string[]> {
    const prefix = this.fullKey(pattern.replace('*', ''));
    const r: string[] = [];
    for (const [k, e] of this.store) { if (this.isExpired(e)) { this.store.delete(k); continue; } if (k.startsWith(prefix)) r.push(k.replace(`${this.keyPrefix}:`, '')); }
    return r;
  }
  async clear(): Promise<number> { const keys = await this.keys(''); return this.deleteMany(keys); }
  async increment(key: string, by = 1): Promise<number> { const c = await this.get<number>(key); const n = (c ?? 0) + by; await this.set(key, n); return n; }
  async decrement(key: string, by = 1): Promise<number> { return this.increment(key, -by); }
}
