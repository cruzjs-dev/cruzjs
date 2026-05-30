/**
 * Chatbots — app-owned table (minimal CRUD demo).
 *
 * Plain SQLite/D1 table. User-scoped: each chatbot belongs to the creating user.
 */

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const chatbots = sqliteTable('Chatbot', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  ownerId: text('ownerId').notNull(),
  name: text('name').notNull(),
  systemPrompt: text('systemPrompt').notNull().default('You are a helpful assistant.'),
  model: text('model').notNull().default('openai/gpt-4o-mini'),
  createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
});

export type Chatbot = typeof chatbots.$inferSelect;
export type NewChatbot = typeof chatbots.$inferInsert;
