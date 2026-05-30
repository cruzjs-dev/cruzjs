/**
 * Billing Database Schema
 *
 * Tables for plans, subscriptions, invoices, usage records, and billing customers.
 * Uses text-mode timestamps (ISO8601 strings) to match core schema conventions.
 */

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { organizations } from '@cruzjs/core/database/schema';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createBillingSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { organizations: TableRef<{ id: string }> }) => {
  const plansTable = b.table('BillingPlan', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    name: b.text('name').notNull(),
    description: b.text('description'),
    stripePriceId: b.text('stripePriceId').notNull(),
    type: b.text('type').notNull().default('flat'),
    amount: b.integer('amount').notNull(),
    interval: b.text('interval').notNull().default('month'),
    currency: b.text('currency').notNull().default('usd'),
    trialDays: b.integer('trialDays').notNull().default(0),
    features: b.text('features').notNull().default('[]'),
    limits: b.text('limits').notNull().default('{}'),
    active: b.boolean('active').notNull().default(true),
    sortOrder: b.integer('sortOrder').notNull().default(0),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    stripePriceIdIdx: b.uniqueIndex('BillingPlan_stripePriceId_idx').on(table.stripePriceId),
    activeIdx: b.index('BillingPlan_active_idx').on(table.active),
  }));

  const billingCustomersTable = b.table('BillingCustomer', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    stripeCustomerId: b.text('stripeCustomerId').notNull(),
    email: b.text('email').notNull(),
    name: b.text('name'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.uniqueIndex('BillingCustomer_orgId_idx').on(table.orgId),
    stripeCustomerIdIdx: b.uniqueIndex('BillingCustomer_stripeCustomerId_idx').on(table.stripeCustomerId),
  }));

  const billingSubscriptionsTable = b.table('BillingSubscription', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    planId: b.text('planId').notNull().references(() => plansTable.id),
    stripeSubscriptionId: b.text('stripeSubscriptionId').notNull(),
    stripeCustomerId: b.text('stripeCustomerId').notNull(),
    status: b.text('status').notNull().default('active'),
    currentPeriodStart: b.text('currentPeriodStart').notNull(),
    currentPeriodEnd: b.text('currentPeriodEnd').notNull(),
    cancelAtPeriodEnd: b.boolean('cancelAtPeriodEnd').notNull().default(false),
    trialEnd: b.text('trialEnd'),
    quantity: b.integer('quantity').notNull().default(1),
    metadata: b.text('metadata').notNull().default('{}'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.uniqueIndex('BillingSubscription_orgId_idx').on(table.orgId),
    stripeSubIdIdx: b.uniqueIndex('BillingSubscription_stripeSubscriptionId_idx').on(table.stripeSubscriptionId),
    statusIdx: b.index('BillingSubscription_status_idx').on(table.status),
  }));

  const billingInvoicesTable = b.table('BillingInvoice', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    stripeInvoiceId: b.text('stripeInvoiceId').notNull(),
    amount: b.integer('amount').notNull(),
    currency: b.text('currency').notNull().default('usd'),
    status: b.text('status').notNull().default('draft'),
    paidAt: b.text('paidAt'),
    dueDate: b.text('dueDate'),
    pdfUrl: b.text('pdfUrl'),
    hostedUrl: b.text('hostedUrl'),
    periodStart: b.text('periodStart').notNull(),
    periodEnd: b.text('periodEnd').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('BillingInvoice_orgId_idx').on(table.orgId),
    stripeInvoiceIdIdx: b.uniqueIndex('BillingInvoice_stripeInvoiceId_idx').on(table.stripeInvoiceId),
    statusIdx: b.index('BillingInvoice_status_idx').on(table.status),
  }));

  const billingUsageRecordsTable = b.table('BillingUsageRecord', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    subscriptionItemId: b.text('subscriptionItemId').notNull(),
    metric: b.text('metric').notNull(),
    quantity: b.integer('quantity').notNull(),
    timestamp: b.text('timestamp').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('BillingUsageRecord_orgId_idx').on(table.orgId),
    metricIdx: b.index('BillingUsageRecord_metric_idx').on(table.metric),
    timestampIdx: b.index('BillingUsageRecord_timestamp_idx').on(table.timestamp),
  }));

  const plansRels = relations(plansTable, ({ many }) => ({
    subscriptions: many(billingSubscriptionsTable),
  }));

  const billingCustomersRels = relations(billingCustomersTable, ({ one }) => ({
    organization: one(refs.organizations, { fields: [billingCustomersTable.orgId], references: [refs.organizations.id] }),
  }));

  const billingSubscriptionsRels = relations(billingSubscriptionsTable, ({ one }) => ({
    organization: one(refs.organizations, { fields: [billingSubscriptionsTable.orgId], references: [refs.organizations.id] }),
    plan: one(plansTable, { fields: [billingSubscriptionsTable.planId], references: [plansTable.id] }),
  }));

  const billingInvoicesRels = relations(billingInvoicesTable, ({ one }) => ({
    organization: one(refs.organizations, { fields: [billingInvoicesTable.orgId], references: [refs.organizations.id] }),
  }));

  const billingUsageRecordsRels = relations(billingUsageRecordsTable, ({ one }) => ({
    organization: one(refs.organizations, { fields: [billingUsageRecordsTable.orgId], references: [refs.organizations.id] }),
  }));

  return {
    plans: plansTable,
    billingCustomers: billingCustomersTable,
    billingSubscriptions: billingSubscriptionsTable,
    billingInvoices: billingInvoicesTable,
    billingUsageRecords: billingUsageRecordsTable,
    plansRelations: plansRels,
    billingCustomersRelations: billingCustomersRels,
    billingSubscriptionsRelations: billingSubscriptionsRels,
    billingInvoicesRelations: billingInvoicesRels,
    billingUsageRecordsRelations: billingUsageRecordsRels,
  };
},
);

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createBillingSchema({ organizations });
export const plans = _s.plans;
export const billingCustomers = _s.billingCustomers;
export const billingSubscriptions = _s.billingSubscriptions;
export const billingInvoices = _s.billingInvoices;
export const billingUsageRecords = _s.billingUsageRecords;
export const plansRelations = _s.plansRelations;
export const billingCustomersRelations = _s.billingCustomersRelations;
export const billingSubscriptionsRelations = _s.billingSubscriptionsRelations;
export const billingInvoicesRelations = _s.billingInvoicesRelations;
export const billingUsageRecordsRelations = _s.billingUsageRecordsRelations;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;

export type BillingCustomerRow = typeof billingCustomers.$inferSelect;
export type NewBillingCustomerRow = typeof billingCustomers.$inferInsert;

export type BillingSubscriptionRow = typeof billingSubscriptions.$inferSelect;
export type NewBillingSubscriptionRow = typeof billingSubscriptions.$inferInsert;

export type BillingInvoiceRow = typeof billingInvoices.$inferSelect;
export type NewBillingInvoiceRow = typeof billingInvoices.$inferInsert;

export type BillingUsageRecordRow = typeof billingUsageRecords.$inferSelect;
export type NewBillingUsageRecordRow = typeof billingUsageRecords.$inferInsert;
