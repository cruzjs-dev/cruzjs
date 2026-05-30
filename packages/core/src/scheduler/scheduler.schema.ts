/**
 * Scheduler Database Schema
 *
 * Tables for tracking scheduled task state and execution history.
 * These are system-level tables (no org scoping) since scheduled tasks
 * are global to the application.
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createSchedulerSchema = DrizzleUniversalFactory.create((b) => {
  const scheduledTasksTable = b.table('ScheduledTasks', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    name: b.text('name').notNull().unique(),
    description: b.text('description'),
    cronExpression: b.text('cronExpression').notNull(),
    isActive: b.boolean('isActive').default(true).notNull(),
    lastRunAt: b.dateTimestamp('lastRunAt'),
    lastRunStatus: b.text('lastRunStatus'),
    lastRunDurationMs: b.integer('lastRunDurationMs'),
    nextRunAt: b.dateTimestamp('nextRunAt'),
    createdAt: b.dateTimestamp('createdAt').notNull().$defaultFn(() => new Date()),
    updatedAt: b.dateTimestamp('updatedAt').notNull().$defaultFn(() => new Date()),
  });

  const scheduledTaskRunsTable = b.table('ScheduledTaskRuns', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    taskName: b.text('taskName').notNull(),
    status: b.text('status').notNull(),
    startedAt: b.dateTimestamp('startedAt').notNull(),
    completedAt: b.dateTimestamp('completedAt'),
    durationMs: b.integer('durationMs'),
    output: b.text('output'),
    error: b.text('error'),
    createdAt: b.dateTimestamp('createdAt').notNull().$defaultFn(() => new Date()),
  }, (table: any) => ({
    taskNameIdx: b.index('ScheduledTaskRuns_taskName_idx').on(table.taskName),
    startedAtIdx: b.index('ScheduledTaskRuns_startedAt_idx').on(table.startedAt),
  }));

  return {
    scheduledTasks: scheduledTasksTable,
    scheduledTaskRuns: scheduledTaskRunsTable,
  };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createSchedulerSchema();
export const scheduledTasks = _s.scheduledTasks;
export const scheduledTaskRuns = _s.scheduledTaskRuns;

// ─── Type Exports ───────────────────────────────────────────────────────────

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type NewScheduledTask = typeof scheduledTasks.$inferInsert;

export type ScheduledTaskRun = typeof scheduledTaskRuns.$inferSelect;
export type NewScheduledTaskRun = typeof scheduledTaskRuns.$inferInsert;
