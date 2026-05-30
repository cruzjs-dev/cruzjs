/**
 * In-Memory Scheduler Adapter
 *
 * Simple in-memory lock for development and single-instance deployments.
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';

type LockEntry = {
  acquiredAt: number;
  expiresAt: number;
};

export class InMemorySchedulerAdapter implements SchedulerAdapter {
  private readonly locks = new Map<string, LockEntry>();

  async acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(name);
    if (existing && existing.expiresAt > now) return false;
    this.locks.set(name, { acquiredAt: now, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  async releaseLock(name: string): Promise<void> {
    this.locks.delete(name);
  }
}
