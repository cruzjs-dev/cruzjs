/**
 * Webhook Database Schema
 *
 * Tables for webhook registration and delivery tracking.
 * Uses text-mode timestamps (ISO8601 strings) to match core schema conventions.
 */

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import type { WebhookPayload } from './webhook.types';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createWebhookSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { organizations: TableRef<{ id: string }>; authIdentity: TableRef<{ id: string }> }) => {
  const webhooksTable = b.table('Webhook', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    createdById: b.text('createdById').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
    url: b.text('url').notNull(),
    secret: b.text('secret').notNull(),
    events: b.text('events').notNull().default('["*"]'),
    isActive: b.boolean('isActive').default(true).notNull(),
    description: b.text('description'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('Webhook_orgId_idx').on(table.orgId),
  }));

  const webhookDeliveriesTable = b.table('WebhookDelivery', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    webhookId: b.text('webhookId').notNull().references(() => webhooksTable.id, { onDelete: 'cascade' }),
    eventType: b.text('eventType').notNull(),
    payload: b.text('payload').notNull().default('{}'),
    status: b.text('status').notNull().default('pending'),
    statusCode: b.integer('statusCode'),
    responseBody: b.text('responseBody'),
    attempts: b.integer('attempts').default(0).notNull(),
    lastAttemptAt: b.text('lastAttemptAt'),
    nextRetryAt: b.text('nextRetryAt'),
    error: b.text('error'),
    durationMs: b.integer('durationMs'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    webhookIdIdx: b.index('WebhookDelivery_webhookId_idx').on(table.webhookId),
    statusIdx: b.index('WebhookDelivery_status_idx').on(table.status),
  }));

  const webhooksRels = relations(webhooksTable, ({ one, many }) => ({
    organization: one(refs.organizations, { fields: [webhooksTable.orgId], references: [refs.organizations.id] }),
    createdBy: one(refs.authIdentity, { fields: [webhooksTable.createdById], references: [refs.authIdentity.id] }),
    deliveries: many(webhookDeliveriesTable),
  }));

  const webhookDeliveriesRels = relations(webhookDeliveriesTable, ({ one }) => ({
    webhook: one(webhooksTable, { fields: [webhookDeliveriesTable.webhookId], references: [webhooksTable.id] }),
  }));

  return {
    webhooks: webhooksTable,
    webhookDeliveries: webhookDeliveriesTable,
    webhooksRelations: webhooksRels,
    webhookDeliveriesRelations: webhookDeliveriesRels,
  };
},
);

// ─── Re-export from database/schema (source of truth for table instances) ────

export { webhooks, webhookDeliveries, webhooksRelations, webhookDeliveriesRelations } from '../database/schema';

// ============================================================================
// TYPE EXPORTS (derived from factory return type to avoid circular deps)
// ============================================================================

type WebhookSchemaResult = ReturnType<typeof createWebhookSchema>;
export type Webhook = WebhookSchemaResult['webhooks']['$inferSelect'];
export type NewWebhook = WebhookSchemaResult['webhooks']['$inferInsert'];

export type WebhookDelivery = WebhookSchemaResult['webhookDeliveries']['$inferSelect'];
export type NewWebhookDelivery = WebhookSchemaResult['webhookDeliveries']['$inferInsert'];
