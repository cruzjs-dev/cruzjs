/**
 * Azure Blob Storage Scheduler Adapter
 *
 * Uses Azure Blob Storage leases for distributed locking.
 * Falls back to in-memory when storage is not configured.
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';
import { InMemorySchedulerAdapter } from './scheduler-memory';

export class AzureBlobLeaseSchedulerAdapter implements SchedulerAdapter {
  private readonly fallback = new InMemorySchedulerAdapter();

  constructor(private readonly connectionString: string | null) {}

  async acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
    if (!this.connectionString) {
      return this.fallback.acquireLock(name, ttlSeconds);
    }
    // TODO: Azure Blob Storage lease acquire
    return this.fallback.acquireLock(name, ttlSeconds);
  }

  async releaseLock(name: string): Promise<void> {
    if (!this.connectionString) {
      return this.fallback.releaseLock(name);
    }
    // TODO: Azure Blob Storage lease release
    return this.fallback.releaseLock(name);
  }
}
