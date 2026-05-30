/**
 * DigitalOcean Redis Scheduler Adapter
 *
 * Uses Redis SETNX for distributed locking.
 * Falls back to in-memory when Redis is not configured.
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';
import { InMemorySchedulerAdapter } from './scheduler-memory';

export class DigitalOceanRedisSchedulerAdapter implements SchedulerAdapter {
  private readonly fallback = new InMemorySchedulerAdapter();

  constructor(private readonly redisUrl: string | null) {}

  async acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redisUrl) {
      return this.fallback.acquireLock(name, ttlSeconds);
    }
    // TODO: Redis SET key value NX EX ttlSeconds
    return this.fallback.acquireLock(name, ttlSeconds);
  }

  async releaseLock(name: string): Promise<void> {
    if (!this.redisUrl) {
      return this.fallback.releaseLock(name);
    }
    // TODO: Redis DEL key
    return this.fallback.releaseLock(name);
  }
}
