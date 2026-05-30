/**
 * @cruzjs/saas Database Schema
 *
 * Pro tables: subscriptions and audit logs. Org tables moved to @cruzjs/core.
 *
 * All tables are built via the dialect-agnostic factory (`createProSchema`)
 * using the active DialectBuilder set at application startup.
 */

import { createId } from '@paralleldrive/cuid2';
import { authIdentity, organizations } from '@cruzjs/core/database/schema';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';
import { createBillingSchema } from '../billing/billing.schema';
import { createImpersonationSchema } from '../admin/admin.impersonation.schema';
import { createRichTextSchema } from '../rich-text/rich-text.schema';

// Re-export core org tables and types for backwards compatibility
export {
  organizations,
  orgMembers,
  invitations,
  OrgRoleValues,
  OrgRoleLowercase,
} from '@cruzjs/core/database/schema';
export type { OrgRole, OrgRoleLower, Organization, NewOrganization } from '@cruzjs/core/database/schema';

// Re-export billing tables
export * from '../billing/billing.schema';

// Re-export admin impersonation tables
export { impersonationTokens } from '../admin/admin.impersonation.schema';
export type { ImpersonationToken, NewImpersonationToken } from '../admin/admin.impersonation.schema';

// Re-export rich text tables
export * from '../rich-text/rich-text.schema';

// Helper for generating IDs
const generateId = () => createId();

// Helper for current timestamp as ISO string
const nowISO = () => new Date().toISOString();

// ============================================================================
// AGGREGATE FACTORY
// ============================================================================

/**
 * Build the full @cruzjs/saas schema for any dialect.
 * Pass the core schema refs (organizations, authIdentity) from `createCoreSchema()`.
 */
export const createProSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { organizations: TableRef<{ id: string }>; authIdentity: TableRef<{ id: string }> }) => {
  const billing = createBillingSchema({ organizations: refs.organizations });
  const impersonation = createImpersonationSchema({ authIdentity: refs.authIdentity });
  const richText = createRichTextSchema();

  // Pro-level subscriptions table (legacy, thin wrapper)
  const subscriptionsTable = b.table('Subscription', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    stripeCustomerId: b.text('stripeCustomerId'),
    stripeSubscriptionId: b.text('stripeSubscriptionId').unique(),
    stripePriceId: b.text('stripePriceId'),
    status: b.text('status').notNull().default('active'),
    currentPeriodStart: b.text('currentPeriodStart'),
    currentPeriodEnd: b.text('currentPeriodEnd'),
    cancelAtPeriodEnd: b.boolean('cancelAtPeriodEnd').default(false),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  });

  // Audit log
  const auditLogsTable = b.table('AuditLog', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
    userId: b.text('userId').references(() => fkRef(refs.authIdentity.id), { onDelete: 'set null' }),
    action: b.text('action').notNull(),
    resource: b.text('resource'),
    metadata: b.text('metadata').default('{}'),
    entityType: b.text('entityType'),
    entityId: b.text('entityId'),
    details: b.text('details').default('{}'),
    ipAddress: b.text('ipAddress'),
    userAgent: b.text('userAgent'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('AuditLog_orgId_idx').on(table.orgId),
    userIdIdx: b.index('AuditLog_userId_idx').on(table.userId),
    actionIdx: b.index('AuditLog_action_idx').on(table.action),
    resourceIdx: b.index('AuditLog_resource_idx').on(table.resource),
    createdAtIdx: b.index('AuditLog_createdAt_idx').on(table.createdAt),
  }));

  return {
    subscriptions: subscriptionsTable,
    auditLogs: auditLogsTable,
    ...billing,
    ...impersonation,
    ...richText,
  };
},
);

// ─── Named convenience exports ──────────────────────────────────────────────

const _pro = createProSchema({ organizations, authIdentity });
export const subscriptions = _pro.subscriptions;
export const auditLogs = _pro.auditLogs;
