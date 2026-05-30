/**
 * PDFs — app-owned table for uploaded documents + their AI analysis.
 *
 * Plain SQLite/D1 table. User-scoped: each PDF belongs to the uploading user.
 * `extractedText` holds the markdown produced by Workers AI `toMarkdown`;
 * `analysis` holds the LLM-generated summary used as chat context.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const pdfs = sqliteTable('Pdf', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  ownerId: text('ownerId').notNull(),
  name: text('name').notNull(),
  r2Key: text('r2Key').notNull(),
  sizeBytes: integer('sizeBytes').notNull().default(0),
  status: text('status').notNull().default('ready'), // 'ready' | 'error'
  extractedText: text('extractedText'),
  analysis: text('analysis'),
  error: text('error'),
  createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
});

export type Pdf = typeof pdfs.$inferSelect;
export type NewPdf = typeof pdfs.$inferInsert;
