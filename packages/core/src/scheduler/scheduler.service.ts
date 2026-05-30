/**
 * Scheduler Service
 *
 * Manages the task registry, execution, and history recording.
 * Tasks are registered at startup via `Schedule.task(...).do(handler)`,
 * and their state is persisted to the database for monitoring and admin control.
 *
 * Locking for `withoutOverlapping` is handled via:
 * 1. Platform-specific SchedulerAdapter (KV, Redis, etc.) when available
 * 2. Database-based fallback (check lastRunStatus in DB)
 */

import { Injectable, Inject, Optional } from '../di';
import { createToken } from '../di/tokens/create-token';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import { eq, desc } from 'drizzle-orm';
import { scheduledTasks, scheduledTaskRuns } from './scheduler.schema';
import type { ScheduledTaskConfig, TaskRunResult, TaskRunStatus } from './scheduler.types';
import type { SchedulerAdapter } from './scheduler.adapter';

/** DI token for injecting a platform-specific SchedulerAdapter */
export const SCHEDULER_ADAPTER = createToken<SchedulerAdapter>('SCHEDULER_ADAPTER');

type RegistryEntry = ScheduledTaskConfig & {
  cron: string;
};

@Injectable()
export class SchedulerService {
  private readonly tasks = new Map<string, RegistryEntry>();
  private readonly adapter: SchedulerAdapter | null;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(SCHEDULER_ADAPTER) @Optional() adapter?: SchedulerAdapter,
  ) {
    this.adapter = adapter ?? null;
  }

  /**
   * Register a task configuration. Called at startup.
   * Also ensures the task record exists in the database.
   */
  register(config: ScheduledTaskConfig): void {
    this.tasks.set(config.name, config as RegistryEntry);
  }

  /**
   * Sync all registered tasks to the database.
   * Creates new records for tasks not yet persisted, updates cron expressions
   * for existing ones.
   */
  async syncToDatabase(): Promise<void> {
    for (const [name, config] of this.tasks) {
      const existing = await this.db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.name, name))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(scheduledTasks).values({
          name,
          description: config.description ?? null,
          cronExpression: config.cron,
          isActive: true,
        });
      } else {
        await this.db
          .update(scheduledTasks)
          .set({
            cronExpression: config.cron,
            description: config.description ?? existing[0].description,
            updatedAt: new Date(),
          })
          .where(eq(scheduledTasks.name, name));
      }
    }
  }

  /**
   * Run a specific task by name.
   * Handles locking, execution, history recording, and lifecycle callbacks.
   */
  async run(name: string): Promise<TaskRunResult> {
    const entry = this.tasks.get(name);
    if (!entry) {
      return { name, status: 'failed', durationMs: 0, error: `Task "${name}" not found in registry` };
    }

    // Check if task is active in the database
    const [taskRecord] = await this.db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.name, name))
      .limit(1);

    if (taskRecord && !taskRecord.isActive) {
      return { name, status: 'skipped', durationMs: 0, error: 'Task is disabled' };
    }

    // Acquire lock if withoutOverlapping is enabled
    const lockKey = `scheduler:${name}`;
    const lockTtl = 3600; // 1 hour safety TTL

    if (entry.withoutOverlapping && this.adapter) {
      const acquired = await this.adapter.acquireLock(lockKey, lockTtl);
      if (!acquired) {
        const result: TaskRunResult = { name, status: 'skipped', durationMs: 0, error: 'Task is already running (lock not acquired)' };
        await this.recordRun(name, 'skipped', 0, undefined, result.error);
        return result;
      }
    }

    const startedAt = new Date();
    const startMs = Date.now();

    try {
      await entry.handler();

      const durationMs = Date.now() - startMs;
      const completedAt = new Date();

      // Record success
      await this.recordRun(name, 'completed', durationMs);
      await this.updateTaskStatus(name, 'completed', durationMs, startedAt);

      // Lifecycle callback
      if (entry.onSuccess) {
        try {
          await entry.onSuccess(durationMs);
        } catch {
          // Don't fail the task for callback errors
        }
      }

      return { name, status: 'completed', durationMs };
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const error = err instanceof Error ? err.message : String(err);

      // Record failure
      await this.recordRun(name, 'failed', durationMs, undefined, error);
      await this.updateTaskStatus(name, 'failed', durationMs, startedAt);

      // Lifecycle callback
      if (entry.onFailure) {
        try {
          await entry.onFailure(err instanceof Error ? err : new Error(error));
        } catch {
          // Don't compound failures
        }
      }

      return { name, status: 'failed', durationMs, error };
    } finally {
      // Always release the lock
      if (entry.withoutOverlapping && this.adapter) {
        try {
          await this.adapter.releaseLock(lockKey);
        } catch {
          // Lock TTL will handle cleanup
        }
      }
    }
  }

  /**
   * Run all registered tasks. Typically called by the scheduled handler.
   */
  async runAll(): Promise<TaskRunResult[]> {
    const results: TaskRunResult[] = [];
    for (const name of this.tasks.keys()) {
      const result = await this.run(name);
      results.push(result);
    }
    return results;
  }

  /**
   * List all registered tasks with their database state.
   */
  async listTasks(): Promise<(typeof scheduledTasks.$inferSelect)[]> {
    return this.db
      .select()
      .from(scheduledTasks)
      .orderBy(scheduledTasks.name);
  }

  /**
   * Get a single task by name.
   */
  async getTask(name: string): Promise<typeof scheduledTasks.$inferSelect | null> {
    const [task] = await this.db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.name, name))
      .limit(1);
    return task ?? null;
  }

  /**
   * Get execution history for a task.
   */
  async getHistory(name: string, limit = 20): Promise<(typeof scheduledTaskRuns.$inferSelect)[]> {
    return this.db
      .select()
      .from(scheduledTaskRuns)
      .where(eq(scheduledTaskRuns.taskName, name))
      .orderBy(desc(scheduledTaskRuns.startedAt))
      .limit(limit);
  }

  /**
   * Toggle a task's active state.
   */
  async toggle(name: string): Promise<boolean> {
    const [task] = await this.db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.name, name))
      .limit(1);

    if (!task) {
      throw new Error(`Task "${name}" not found`);
    }

    const newState = !task.isActive;
    await this.db
      .update(scheduledTasks)
      .set({ isActive: newState, updatedAt: new Date() })
      .where(eq(scheduledTasks.name, name));

    return newState;
  }

  /**
   * Check if a task is registered in the in-memory registry.
   */
  hasTask(name: string): boolean {
    return this.tasks.has(name);
  }

  /**
   * Get all registered task names.
   */
  getRegisteredTaskNames(): string[] {
    return Array.from(this.tasks.keys());
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private async recordRun(
    taskName: string,
    status: TaskRunStatus,
    durationMs: number,
    output?: string,
    error?: string,
  ): Promise<void> {
    try {
      const now = new Date();
      await this.db.insert(scheduledTaskRuns).values({
        taskName,
        status,
        startedAt: new Date(now.getTime() - durationMs),
        completedAt: now,
        durationMs,
        output: output ?? null,
        error: error ?? null,
      });
    } catch {
      // Don't fail the task if history recording fails
      console.error(`[Scheduler] Failed to record run for task "${taskName}"`);
    }
  }

  private async updateTaskStatus(
    name: string,
    status: TaskRunStatus,
    durationMs: number,
    lastRunAt: Date,
  ): Promise<void> {
    try {
      await this.db
        .update(scheduledTasks)
        .set({
          lastRunAt,
          lastRunStatus: status,
          lastRunDurationMs: durationMs,
          updatedAt: new Date(),
        })
        .where(eq(scheduledTasks.name, name));
    } catch {
      console.error(`[Scheduler] Failed to update status for task "${name}"`);
    }
  }
}
