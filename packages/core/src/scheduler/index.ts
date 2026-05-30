/**
 * @cruzjs/core Scheduler
 *
 * Fluent task scheduling with database-backed history,
 * distributed locking, and admin tRPC endpoints.
 */

// Types
export type {
  TaskStatus,
  TaskRunStatus,
  ScheduledTaskConfig,
  TaskRunResult,
  ScheduledTaskInfo,
  TaskRunInfo,
} from './scheduler.types';

// Adapter interface
export type { SchedulerAdapter } from './scheduler.adapter';

// Schema
export {
  scheduledTasks,
  scheduledTaskRuns,
} from './scheduler.schema';
export type {
  ScheduledTask,
  NewScheduledTask,
  ScheduledTaskRun,
  NewScheduledTaskRun,
} from './scheduler.schema';

// Fluent builder
export { Schedule } from './schedule';

// Service
export { SchedulerService, SCHEDULER_ADAPTER } from './scheduler.service';

// tRPC router
export { SchedulerTrpc } from './scheduler.trpc';

// Validation
export {
  runTaskSchema,
  taskHistorySchema,
  toggleTaskSchema,
} from './scheduler.validation';
export type {
  RunTaskInput,
  TaskHistoryInput,
  ToggleTaskInput,
} from './scheduler.validation';

// Module
export { SchedulerModule } from './scheduler.module';

// Bridge helper
export { defineSchedule } from './define-schedule';
