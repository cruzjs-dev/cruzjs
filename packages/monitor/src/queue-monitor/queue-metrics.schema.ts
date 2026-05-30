/**
 * Queue Metrics Schema
 *
 * Stores per-queue, per-minute aggregated metrics for
 * throughput, runtime, wait time, and failure tracking.
 */

import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

export const queueMetrics = sqliteTable('QueueMetric', {
  id: text('id').primaryKey().$defaultFn(generateId),
  queue: text('queue').notNull(),
  period: text('period').notNull(), // 'YYYY-MM-DDTHH:MM' minute granularity
  processedCount: integer('processedCount').default(0).notNull(),
  failedCount: integer('failedCount').default(0).notNull(),
  totalRuntimeMs: integer('totalRuntimeMs').default(0).notNull(),
  totalWaitTimeMs: integer('totalWaitTimeMs').default(0).notNull(),
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
  updatedAt: text('updatedAt').notNull().$defaultFn(nowISO),
}, (table) => ({
  queuePeriodUniq: uniqueIndex('QueueMetric_queue_period_uniq').on(table.queue, table.period),
}));

// Type exports
export type QueueMetric = typeof queueMetrics.$inferSelect;
export type NewQueueMetric = typeof queueMetrics.$inferInsert;
