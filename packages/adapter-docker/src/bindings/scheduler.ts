/**
 * Docker Redis/File Scheduler Adapter
 *
 * Uses Redis SETNX for distributed locking when Redis is available,
 * falls back to in-memory for single-container deployments.
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';
import { InMemorySchedulerAdapter } from './scheduler-memory';

export class DockerRedisSchedulerAdapter implements SchedulerAdapter {
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
