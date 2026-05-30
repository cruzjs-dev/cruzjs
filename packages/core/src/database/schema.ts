/**
 * @cruzjs/core Database Schema
 *
 * Core tables owned by the open-source core package:
 * Auth & Identity, Sessions, Refresh Tokens, Jobs, Email Logs, Uploads
 *
 * All tables are built via the dialect-agnostic factory (`createCoreSchema`)
 * using the active DialectBuilder set at application startup.
 */

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createWebhookSchema } from '../webhooks/webhook.schema';
import { createFeatureFlagSchema } from '../feature-flags/feature-flag.schema';
import { createTwoFactorSchema } from '../two-factor/two-factor.schema';

// Helper for generating IDs
const generateId = () => createId();

// Helper for current timestamp as ISO string
const nowISO = () => new Date().toISOString();

// ============================================================================
// DIALECT-AGNOSTIC FACTORY
// ============================================================================

/**
 * Build the core schema tables using any Drizzle dialect builder.
 *
 * Call with `sqliteBuilder`, `pgBuilder`, or `mysqlBuilder` from
 * `@cruzjs/drizzle-universal`.  Returns the same table set used by the
 * named exports below, but wired to the requested dialect so that
 * migrations and queries work against D1, PostgreSQL, MySQL, etc.
 *
 * @example
 * import { pgBuilder } from '@cruzjs/drizzle-universal';
 * const schema = createCoreSchema(pgBuilder);
 */
export const createCoreSchema = DrizzleUniversalFactory.create((b) => {
  const authIdentityTable = b.table('AuthIdentity', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    email: b.text('email').notNull().unique(),
    emailVerified: b.text('emailVerified'),
    emailVerificationToken: b.text('emailVerificationToken').unique(),
    password: b.text('password'),
    passwordResetToken: b.text('passwordResetToken').unique(),
    passwordResetExpiry: b.text('passwordResetExpiry'),
    isBanned: b.boolean('isBanned').default(false),
    deletionRequestedAt: b.text('deletionRequestedAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  });

  const accountsTable = b.table('Account', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().references(() => authIdentityTable.id, { onDelete: 'cascade' }),
    type: b.text('type').notNull().default('oauth'),
    provider: b.text('provider').notNull(),
    providerAccountId: b.text('providerAccountId').notNull(),
    accessToken: b.text('accessToken'),
    refreshToken: b.text('refreshToken'),
    idToken: b.text('idToken'),
    tokenType: b.text('tokenType'),
    scope: b.text('scope'),
    expiresAt: b.text('expiresAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    providerAccountIdx: b.uniqueIndex('Account_provider_providerAccountId_idx').on(table.provider, table.providerAccountId),
  }));

  const sessionsTable = b.table('Session', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    sessionToken: b.text('sessionToken').notNull().unique(),
    userId: b.text('userId').notNull().references(() => authIdentityTable.id, { onDelete: 'cascade' }),
    currentOrgId: b.text('currentOrgId'),
    expiresAt: b.text('expiresAt').notNull(),
    csrfToken: b.text('csrfToken'),
    userAgent: b.text('userAgent'),
    ipAddress: b.text('ipAddress'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  });

  const refreshTokensTable = b.table('RefreshToken', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    token: b.text('token').notNull().unique(),
    userId: b.text('userId').notNull().references(() => authIdentityTable.id, { onDelete: 'cascade' }),
    expiresAt: b.text('expiresAt').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  });

  const organizationsTable = b.table('Organization', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    name: b.text('name').notNull(),
    slug: b.text('slug').notNull().unique(),
    ownerId: b.text('ownerId').notNull().references(() => authIdentityTable.id),
    avatarUrl: b.text('avatarUrl'),
    settings: b.text('settings').default('{}'),
    deletedAt: b.text('deletedAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  });

  const orgMembersTable = b.table('OrgMember', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => organizationsTable.id, { onDelete: 'cascade' }),
    userId: b.text('userId').notNull().references(() => authIdentityTable.id, { onDelete: 'cascade' }),
    role: b.text('role').notNull().default('member'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgUserIdx: b.uniqueIndex('OrgMember_orgId_userId_idx').on(table.orgId, table.userId),
  }));

  const invitationsTable = b.table('Invitation', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    email: b.text('email').notNull(),
    orgId: b.text('orgId').notNull().references(() => organizationsTable.id, { onDelete: 'cascade' }),
    role: b.text('role').notNull().default('MEMBER'),
    token: b.text('token').notNull().unique(),
    expiresAt: b.text('expiresAt').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    emailOrgIdx: b.uniqueIndex('Invitation_email_orgId_idx').on(table.email, table.orgId),
    tokenIdx: b.index('Invitation_token_idx').on(table.token),
  }));

  const jobsTable = b.table('Job', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    type: b.text('type').notNull(),
    status: b.text('status').notNull().default('PENDING'),
    lookupKey: b.text('lookupKey'),
    payload: b.text('payload').notNull().default('{}'),
    resultSummary: b.text('resultSummary').default('{}'),
    error: b.text('error'),
    priority: b.integer('priority').default(0).notNull(),
    attempts: b.integer('attempts').default(0).notNull(),
    maxAttempts: b.integer('maxAttempts').default(3).notNull(),
    scheduledFor: b.text('scheduledFor').notNull().$defaultFn(nowISO),
    startedAt: b.text('startedAt'),
    completedAt: b.text('completedAt'),
    processedBy: b.text('processedBy'),
    workflowInstanceId: b.text('workflowInstanceId'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    pollIdx: b.index('Job_poll_idx').on(table.status, table.priority, table.scheduledFor, table.createdAt),
    lookupKeyIdx: b.index('Job_lookupKey_idx').on(table.lookupKey),
    typeStatusIdx: b.index('Job_type_status_idx').on(table.type, table.status),
    typeIdx: b.index('Job_type_idx').on(table.type),
  }));

  const emailLogsTable = b.table('EmailLog', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    to: b.text('to').notNull(),
    from: b.text('from'),
    cc: b.text('cc'),
    subject: b.text('subject').notNull(),
    template: b.text('template'),
    status: b.text('status').notNull().default('PENDING'),
    messageId: b.text('messageId'),
    error: b.text('error'),
    sentAt: b.text('sentAt'),
    metadata: b.text('metadata').default('{}'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  });

  const uploadsTable = b.table('Upload', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').references(() => authIdentityTable.id, { onDelete: 'set null' }),
    orgId: b.text('orgId'),
    filename: b.text('filename').notNull(),
    originalFilename: b.text('originalFilename').notNull(),
    mimeType: b.text('mimeType').notNull(),
    size: b.integer('size').notNull(),
    bucket: b.text('bucket').notNull(),
    key: b.text('key').notNull(),
    url: b.text('url'),
    status: b.text('status').default('PENDING').notNull(),
    metadata: b.text('metadata').default('{}'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    uploadedAt: b.text('uploadedAt'),
  }, (table: any) => ({
    userIdIdx: b.index('Upload_userId_idx').on(table.userId),
    orgIdIdx: b.index('Upload_orgId_idx').on(table.orgId),
  }));

  const authIdentityRels = relations(authIdentityTable, ({ many }) => ({
    accounts: many(accountsTable),
    sessions: many(sessionsTable),
    orgMembers: many(orgMembersTable),
  }));

  const organizationsRels = relations(organizationsTable, ({ one, many }) => ({
    owner: one(authIdentityTable, { fields: [organizationsTable.ownerId], references: [authIdentityTable.id] }),
    members: many(orgMembersTable),
    invitations: many(invitationsTable),
  }));

  return {
    authIdentity: authIdentityTable,
    accounts: accountsTable,
    sessions: sessionsTable,
    refreshTokens: refreshTokensTable,
    organizations: organizationsTable,
    orgMembers: orgMembersTable,
    invitations: invitationsTable,
    jobs: jobsTable,
    emailLogs: emailLogsTable,
    emails: emailLogsTable, // alias
    uploads: uploadsTable,
    users: authIdentityTable, // alias
    authIdentityRelations: authIdentityRels,
    organizationsRelations: organizationsRels,
  };
});

// ============================================================================
// NAMED CONVENIENCE EXPORTS
// ============================================================================

const _core = createCoreSchema();
export const authIdentity = _core.authIdentity;
export const accounts = _core.accounts;
export const sessions = _core.sessions;
export const refreshTokens = _core.refreshTokens;
export const organizations = _core.organizations;
export const orgMembers = _core.orgMembers;
export const invitations = _core.invitations;
export const jobs = _core.jobs;
export const emailLogs = _core.emailLogs;
export const emails = _core.emails;
export const uploads = _core.uploads;
export const users = _core.users;
export const authIdentityRelations = _core.authIdentityRelations;
export const organizationsRelations = _core.organizationsRelations;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuthIdentity = typeof authIdentity.$inferSelect;
export type NewAuthIdentity = typeof authIdentity.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export const OrgRoleValues = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type OrgRole = (typeof OrgRoleValues)[number];

// Lowercase role values for database storage
export const OrgRoleLowercase = ['owner', 'admin', 'member', 'viewer'] as const;
export type OrgRoleLower = (typeof OrgRoleLowercase)[number];

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

// Status enum values for runtime validation
export const JobStatusValues = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type JobStatus = (typeof JobStatusValues)[number];
// Backwards compatibility
export const JobStatus = JobStatusValues;

// Type helper for EmailLog
export type EmailLog = typeof emailLogs.$inferSelect;

// Backwards compatibility alias
export type User = AuthIdentity;

// ============================================================================
// SUB-SCHEMA TABLES (created here to avoid circular imports)
// ============================================================================

const _webhook = createWebhookSchema(_core);
export const webhooks = _webhook.webhooks;
export const webhookDeliveries = _webhook.webhookDeliveries;
export const webhooksRelations = _webhook.webhooksRelations;
export const webhookDeliveriesRelations = _webhook.webhookDeliveriesRelations;

const _featureFlags = createFeatureFlagSchema(_core);
export const featureFlags = _featureFlags.featureFlags;
export const featureFlagSegments = _featureFlags.featureFlagSegments;
export const featureFlagOverrides = _featureFlags.featureFlagOverrides;

const _twoFactor = createTwoFactorSchema(_core);
export const twoFactorSecrets = _twoFactor.twoFactorSecrets;
export const trustedDevices = _twoFactor.trustedDevices;

// ============================================================================
// SUB-SCHEMA TYPE EXPORTS
// ============================================================================

export type { Webhook, NewWebhook, WebhookDelivery, NewWebhookDelivery } from '../webhooks/webhook.schema';
export type { FeatureFlag, NewFeatureFlag, FeatureFlagSegment, NewFeatureFlagSegment, FeatureFlagOverride, NewFeatureFlagOverride } from '../feature-flags/feature-flag.schema';
export type { TwoFactorSecretRow, NewTwoFactorSecret, TrustedDeviceRow, NewTrustedDevice } from '../two-factor/two-factor.schema';

// ============================================================================
// PASS-THROUGH RE-EXPORTS (no circular deps — these files don't import from here)
// ============================================================================

export { scheduledTasks, scheduledTaskRuns } from '../scheduler/scheduler.schema';
export type { ScheduledTask, NewScheduledTask, ScheduledTaskRun, NewScheduledTaskRun } from '../scheduler/scheduler.schema';

export { auditLogs } from '../audit/audit.schema';
export type { AuditLog, NewAuditLog } from '../audit/audit.schema';

export { magicLinks } from '../magic-link/magic-link.schema';
export type { MagicLinkRow, NewMagicLinkRow } from '../magic-link/magic-link.schema';

export { managedSessions } from '../sessions/session.schema';
export type { ManagedSession, NewManagedSession } from '../sessions/session.schema';

export { broadcastPresence } from '../broadcasting/broadcast.schema';
export type { BroadcastPresenceRecord, NewBroadcastPresenceRecord } from '../broadcasting/broadcast.schema';
