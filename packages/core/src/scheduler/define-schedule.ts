/**
 * defineSchedule — Bridge from Schedule builder to createCruzApp's ScheduledHandler[]
 *
 * Converts the fluent Schedule API tasks into the raw `ScheduledHandler[]`
 * format expected by `createCruzApp({ scheduled: [...] })`.
 *
 * On first run, each handler registers its task with SchedulerService
 * and delegates execution (with locking, history recording, etc.).
 *
 * @example
 * ```typescript
 * import { Schedule, defineSchedule } from '@cruzjs/core/scheduler';
 *
 * const tasks = [
 *   Schedule.task('cleanup-sessions')
 *     .description('Remove expired sessions')
 *     .daily()
 *     .at('03:00')
 *     .withoutOverlapping()
 *     .do(async () => { ... }),
 *
 *   Schedule.task('send-reports')
 *     .description('Weekly summary emails')
 *     .weeklyOn(1, '09:00')
 *     .do(async () => { ... }),
 * ];
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, SchedulerModule],
 *   scheduled: defineSchedule(tasks),
 * });
 * ```
 */

import type { ScheduledHandler } from '../framework/create-cruz-app';
import type { CruzContainer } from '../di';
import type { ScheduledTaskConfig } from './scheduler.types';
import { SchedulerService } from './scheduler.service';

/**
 * Convert Schedule builder results to ScheduledHandler[] for createCruzApp.
 */
export function defineSchedule(
  tasks: ScheduledTaskConfig[],
): ScheduledHandler[] {
  let initialized = false;

  async function ensureRegistered(container: CruzContainer): Promise<SchedulerService> {
    const service = container.resolve(SchedulerService);

    if (!initialized) {
      for (const task of tasks) {
        service.register(task);
      }
      // Sync task records to database
      try {
        await service.syncToDatabase();
      } catch (err) {
        console.error('[Scheduler] Failed to sync tasks to database:', err);
      }
      initialized = true;
    }

    return service;
  }

  // Group tasks by cron expression for efficient matching
  const cronMap = new Map<string, ScheduledTaskConfig[]>();
  for (const task of tasks) {
    const existing = cronMap.get(task.cron) ?? [];
    existing.push(task);
    cronMap.set(task.cron, existing);
  }

  // Create one ScheduledHandler per unique cron expression
  const handlers: ScheduledHandler[] = [];

  for (const [cron, cronTasks] of cronMap) {
    handlers.push({
      cron,
      handler: async (container: CruzContainer) => {
        const service = await ensureRegistered(container);
        for (const task of cronTasks) {
          try {
            await service.run(task.name);
          } catch (err) {
            console.error(`[Scheduler] Unexpected error running task "${task.name}":`, err);
          }
        }
      },
    });
  }

  return handlers;
}
