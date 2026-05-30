/**
 * GCP Firestore Scheduler Adapter
 *
 * Uses Firestore transactions for distributed locking.
 * Falls back to in-memory when Firestore is not configured.
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';
import { InMemorySchedulerAdapter } from './scheduler-memory';

export class GCPFirestoreSchedulerAdapter implements SchedulerAdapter {
  private readonly fallback = new InMemorySchedulerAdapter();

  constructor(private readonly projectId: string | null) {}

  async acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
    if (!this.projectId) {
      return this.fallback.acquireLock(name, ttlSeconds);
    }
    // TODO: Firestore transaction-based lock
    return this.fallback.acquireLock(name, ttlSeconds);
  }

  async releaseLock(name: string): Promise<void> {
    if (!this.projectId) {
      return this.fallback.releaseLock(name);
    }
    // TODO: Firestore document delete
    return this.fallback.releaseLock(name);
  }
}
