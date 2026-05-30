/**
 * Cloudflare KV Scheduler Adapter
 *
 * Uses Cloudflare KV for distributed locking across edge locations.
 * Lock keys are stored with a TTL for automatic expiration.
 *
 * Falls back to no-op (always acquires) when KV is not available.
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';

const LOCK_PREFIX = 'scheduler-lock:';

export class CloudflareKVSchedulerAdapter implements SchedulerAdapter {
  private readonly kv: KVNamespace | null;

  constructor(kvNamespace: KVNamespace | null) {
    this.kv = kvNamespace;
  }

  async acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
    if (!this.kv) {
      // No KV available — allow execution (local dev)
      return true;
    }

    const key = `${LOCK_PREFIX}${name}`;
    const existing = await this.kv.get(key);

    if (existing) {
      // Lock is held
      return false;
    }

    // Acquire lock with TTL
    await this.kv.put(key, JSON.stringify({ acquiredAt: Date.now() }), {
      expirationTtl: ttlSeconds,
    });

    return true;
  }

  async releaseLock(name: string): Promise<void> {
    if (!this.kv) return;

    const key = `${LOCK_PREFIX}${name}`;
    await this.kv.delete(key);
  }
}
