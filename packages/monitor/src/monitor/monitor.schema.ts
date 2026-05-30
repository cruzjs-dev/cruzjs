/**
 * Monitor Entries Schema
 *
 * Stores debug dashboard entries for requests, queries, jobs, events,
 * mail, notifications, cache operations, and exceptions.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

export const monitorEntries = sqliteTable('MonitorEntry', {
  id: text('id').primaryKey().$defaultFn(generateId),
  type: text('type').notNull(), // MonitorEntryType values
  content: text('content').notNull().default('{}'), // JSON
  familyHash: text('familyHash'),
  batchId: text('batchId'),
  tags: text('tags').default('[]'), // JSON array of strings
  status: text('status').notNull().default('success'), // MonitorEntryStatus values
  duration: integer('duration'), // milliseconds
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
}, (table) => ({
  typeIdx: index('MonitorEntry_type_idx').on(table.type),
  createdAtIdx: index('MonitorEntry_createdAt_idx').on(table.createdAt),
  familyHashIdx: index('MonitorEntry_familyHash_idx').on(table.familyHash),
  statusIdx: index('MonitorEntry_status_idx').on(table.status),
}));

// Type exports
export type MonitorEntry = typeof monitorEntries.$inferSelect;
export type NewMonitorEntry = typeof monitorEntries.$inferInsert;
