/**
 * AI Database Schema
 *
 * Drizzle ORM schema for org-scoped AI configurations.
 * Stores per-org provider settings, encrypted API keys,
 * and usage limits.
 */

import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const orgAiConfigs = sqliteTable('orgAiConfigs', {
  id: text('id').primaryKey(),
  orgId: text('orgId').notNull(),
  provider: text('provider').notNull(),
  encryptedApiKey: text('encryptedApiKey'),
  defaultModel: text('defaultModel'),
  maxTokensPerMonth: integer('maxTokensPerMonth').notNull().default(1000000),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

export type OrgAiConfig = typeof orgAiConfigs.$inferSelect;
export type NewOrgAiConfig = typeof orgAiConfigs.$inferInsert;
