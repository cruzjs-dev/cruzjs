/**
 * In-Memory Scheduler Adapter
 *
 * Simple in-memory lock for development and single-instance deployments.
 * Not suitable for distributed environments — use platform-specific adapters
 * (DynamoDB, Redis, KV, etc.) in production.
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

    // Check if lock exists and hasn't expired
    if (existing && existing.expiresAt > now) {
      return false;
    }

    // Acquire lock
    this.locks.set(name, {
      acquiredAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });

    return true;
  }

  async releaseLock(name: string): Promise<void> {
    this.locks.delete(name);
  }
}
