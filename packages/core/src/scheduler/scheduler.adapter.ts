/**
 * Scheduler Adapter Interface
 *
 * Provider-agnostic interface for distributed locking.
 * Used by SchedulerService to prevent overlapping task runs
 * across multiple instances (edge workers, containers, etc.).
 */

export interface SchedulerAdapter {
  /**
   * Acquire a distributed lock for a task.
   * Returns true if the lock was successfully acquired.
   *
   * @param name - Unique task name used as the lock key
   * @param ttlSeconds - Time-to-live for the lock (auto-release safety net)
   */
  acquireLock(name: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Release a previously acquired lock.
   *
   * @param name - The task name whose lock to release
   */
  releaseLock(name: string): Promise<void>;
}
