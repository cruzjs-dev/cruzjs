/**
 * @cruzjs/start Database Schema
 *
 * Defines tables for starter kit features:
 * - User profiles
 * - API keys
 * - Dashboard layouts
 * - Notifications (with Slack connections and preferences)
 * - AI connections
 * - Integration connections (with sync logs)
 *
 * All tables are built via the dialect-agnostic factory (`createStartSchema`)
 * using the active DialectBuilder set at application startup.
 */

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createCoreSchema } from '@cruzjs/core/database/schema';
import { createProSchema } from '@cruzjs/saas/database/schema';
import { createSocialAuthSchema } from '../social-auth/social-auth.schema';

// Re-export core schema (includes all sub-schema tables: webhooks, feature flags, 2FA, etc.)
export * from '@cruzjs/core/database/schema';

// Re-export pro schema — explicit named exports to avoid auditLogs conflict
// (core already exports auditLogs from the audit module; pro has its own version)
export {
  // Pro's own tables
  subscriptions,
  // Pro re-exports from core (already covered by core re-export above, skip)
  // organizations, orgMembers, invitations, OrgRoleValues, OrgRoleLowercase — from core
  // Billing tables
  plans,
  billingCustomers,
  billingSubscriptions,
  billingInvoices,
  billingUsageRecords,
  plansRelations,
  billingCustomersRelations,
  billingSubscriptionsRelations,
  billingInvoicesRelations,
  billingUsageRecordsRelations,
  // Impersonation
  impersonationTokens,
  // Rich text
  richTextContents,
  richTextAttachments,
  richTextContentsRelations,
  richTextAttachmentsRelations,
  // Factories
  createProSchema,
} from '@cruzjs/saas/database/schema';
export type {
  // Pro re-exports types already from core — skip OrgRole, OrgRoleLower, Organization, NewOrganization
  // Billing types
  PlanRow,
  NewPlanRow,
  BillingCustomerRow,
  NewBillingCustomerRow,
  BillingSubscriptionRow,
  NewBillingSubscriptionRow,
  BillingInvoiceRow,
  NewBillingInvoiceRow,
  BillingUsageRecordRow,
  NewBillingUsageRecordRow,
  // Impersonation types
  ImpersonationToken,
  NewImpersonationToken,
  // Rich text types
  RichTextContentRow,
  NewRichTextContent,
  RichTextAttachmentRow,
  NewRichTextAttachment,
} from '@cruzjs/saas/database/schema';

// Re-export social auth schema
export * from '../social-auth/social-auth.schema';

// Import tables needed for foreign key references in relations
import { authIdentity } from '@cruzjs/core/database/schema';
import { organizations } from '@cruzjs/core/database/schema';

// Helper for generating IDs
const generateId = () => createId();

// Helper for current timestamp as ISO string
const nowISO = () => new Date().toISOString();

// ============================================================================
// CONST/ENUM EXPORTS
// ============================================================================

export const ApiKeyScopeValues = ['READ', 'WRITE', 'ADMIN'] as const;
export type ApiKeyScope = (typeof ApiKeyScopeValues)[number];

export const NotificationTypeValues = [
  'GATE_REVIEW_REQUESTED', 'GATE_ACTION_TAKEN', 'PR_STATUS_CHANGED',
  'CI_STATUS_CHANGED', 'EXECUTION_COMPLETED',
] as const;
export type NotificationType = (typeof NotificationTypeValues)[number];

export const NotificationChannelValues = ['IN_APP', 'EMAIL', 'SLACK', 'SMS', 'PUSH', 'WEBHOOK_CHANNEL'] as const;
export type NotificationChannel = (typeof NotificationChannelValues)[number];

export const AiProviderValues = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'FIREWORKS'] as const;
export type AiProvider = (typeof AiProviderValues)[number];

export const IntegrationProviderValues = ['JIRA', 'LINEAR', 'FIGMA', 'SENTRY'] as const;
export type IntegrationProviderType = (typeof IntegrationProviderValues)[number];

export const IntegrationConnectionStatusValues = ['ACTIVE', 'INACTIVE', 'ERROR'] as const;
export type IntegrationConnectionStatus = (typeof IntegrationConnectionStatusValues)[number];

export const IntegrationSyncStatusValues = [
  'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED',
] as const;
export type IntegrationSyncStatus = (typeof IntegrationSyncStatusValues)[number];

// ============================================================================
// AGGREGATE FACTORY
// ============================================================================

/**
 * Build the full @cruzjs/start schema (core + pro + start) for any dialect.
 *
 * @example
 * import { pgBuilder } from '@cruzjs/drizzle-universal';
 * const schema = createStartSchema(pgBuilder);
 */
export const createStartSchema = DrizzleUniversalFactory.create((b) => {
  const core = createCoreSchema();
  const pro = createProSchema({ organizations: core.organizations, authIdentity: core.authIdentity });
  const socialAuth = createSocialAuthSchema({ authIdentity: core.authIdentity });

  const userProfileTable = b.table('UserProfile', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().unique().references(() => core.authIdentity.id, { onDelete: 'cascade' }),
    fullName: b.text('fullName'),
    avatarUrl: b.text('avatarUrl'),
    phoneNumber: b.text('phoneNumber'),
    bio: b.text('bio'),
    location: b.text('location'),
    company: b.text('company'),
    website: b.text('website'),
    timezone: b.text('timezone').default('UTC'),
    isAdmin: b.boolean('isAdmin').default(false).notNull(),
    onboardingCompleted: b.boolean('onboardingCompleted').default(false),
    featureOnboarding: b.text('featureOnboarding').default('{}'),
    preferences: b.text('preferences').default('{}'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  });

  const apiKeysTable = b.table('ApiKey', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    name: b.text('name').notNull(),
    keyHash: b.text('keyHash').notNull(),
    keyPrefix: b.text('keyPrefix').notNull(),
    scopes: b.text('scopes').notNull(),
    projectScope: b.text('projectScope'),
    expiresAt: b.text('expiresAt'),
    lastUsedAt: b.text('lastUsedAt'),
    createdBy: b.text('createdBy').references(() => core.authIdentity.id),
    revokedAt: b.text('revokedAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('ApiKey_orgId_idx').on(table.orgId),
    keyPrefixIdx: b.index('ApiKey_keyPrefix_idx').on(table.keyPrefix),
    keyHashIdx: b.uniqueIndex('ApiKey_keyHash_idx').on(table.keyHash),
  }));

  const dashboardLayoutsTable = b.table('DashboardLayout', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    userId: b.text('userId').notNull().references(() => core.authIdentity.id, { onDelete: 'cascade' }),
    name: b.text('name').notNull(),
    widgets: b.text('widgets').notNull().default('[]'),
    isDefault: b.boolean('isDefault').default(false),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgUserIdx: b.index('DashboardLayout_orgId_userId_idx').on(table.orgId, table.userId),
    orgDefaultIdx: b.index('DashboardLayout_orgId_isDefault_idx').on(table.orgId, table.isDefault),
  }));

  const notificationsTable = b.table('Notification', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    userId: b.text('userId').notNull().references(() => core.authIdentity.id, { onDelete: 'cascade' }),
    type: b.text('type').notNull(),
    title: b.text('title').notNull(),
    body: b.text('body'),
    linkUrl: b.text('linkUrl'),
    metadata: b.text('metadata').default('{}'),
    isRead: b.boolean('isRead').default(false),
    readAt: b.text('readAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    userReadIdx: b.index('Notification_userId_isRead_idx').on(table.userId, table.isRead),
    orgUserIdx: b.index('Notification_orgId_userId_idx').on(table.orgId, table.userId),
    createdAtIdx: b.index('Notification_createdAt_idx').on(table.createdAt),
  }));

  const slackConnectionsTable = b.table('SlackConnection', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    webhookUrl: b.text('webhookUrl').notNull(),
    channelName: b.text('channelName'),
    isActive: b.boolean('isActive').default(true),
    createdBy: b.text('createdBy').references(() => core.authIdentity.id),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.uniqueIndex('SlackConnection_orgId_idx').on(table.orgId),
  }));

  const notificationPreferencesTable = b.table('NotificationPreference', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().references(() => core.authIdentity.id, { onDelete: 'cascade' }),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    eventType: b.text('eventType').notNull(),
    channel: b.text('channel').notNull(),
    enabled: b.boolean('enabled').notNull().default(true),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    userOrgEventChannelIdx: b.uniqueIndex('NotificationPreference_userId_orgId_eventType_channel_idx').on(
      table.userId, table.orgId, table.eventType, table.channel,
    ),
    userOrgIdx: b.index('NotificationPreference_userId_orgId_idx').on(table.userId, table.orgId),
  }));

  const pushSubscriptionsTable = b.table('PushSubscription', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().references(() => core.authIdentity.id, { onDelete: 'cascade' }),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    endpoint: b.text('endpoint').notNull(),
    p256dh: b.text('p256dh').notNull(),
    auth: b.text('auth').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    userIdIdx: b.index('PushSubscription_userId_idx').on(table.userId),
    endpointUniq: b.uniqueIndex('PushSubscription_endpoint_uniq').on(table.endpoint),
  }));

  const aiConnectionsTable = b.table('AiConnection', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    provider: b.text('provider').notNull(),
    displayName: b.text('displayName'),
    encryptedApiKey: b.text('encryptedApiKey').notNull(),
    apiKeyIv: b.text('apiKeyIv').notNull(),
    selectedModel: b.text('selectedModel'),
    isEnabled: b.boolean('isEnabled').notNull().default(true),
    isDefault: b.boolean('isDefault').notNull().default(false),
    connectedBy: b.text('connectedBy').references(() => core.authIdentity.id),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('AiConnection_orgId_idx').on(table.orgId),
    orgProviderIdx: b.uniqueIndex('AiConnection_orgId_provider_idx').on(table.orgId, table.provider),
  }));

  const integrationConnectionsTable = b.table('IntegrationConnection', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    provider: b.text('provider').notNull(),
    name: b.text('name').notNull(),
    status: b.text('status').notNull().default('ACTIVE'),
    config: b.text('config').notNull().default('{}'),
    lastSyncAt: b.text('lastSyncAt'),
    lastSyncStatus: b.text('lastSyncStatus'),
    createdBy: b.text('createdBy').references(() => core.authIdentity.id),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('IntegrationConnection_orgId_idx').on(table.orgId),
    orgProviderIdx: b.index('IntegrationConnection_orgId_provider_idx').on(table.orgId, table.provider),
  }));

  const integrationSyncLogsTable = b.table('IntegrationSyncLog', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    connectionId: b.text('connectionId').notNull().references(() => integrationConnectionsTable.id, { onDelete: 'cascade' }),
    orgId: b.text('orgId').notNull().references(() => core.organizations.id, { onDelete: 'cascade' }),
    provider: b.text('provider').notNull(),
    direction: b.text('direction').notNull().default('PULL'),
    status: b.text('status').notNull().default('PENDING'),
    itemsSynced: b.integer('itemsSynced').default(0),
    itemsFailed: b.integer('itemsFailed').default(0),
    itemsSkipped: b.integer('itemsSkipped').default(0),
    errorMessage: b.text('errorMessage'),
    startedAt: b.text('startedAt'),
    completedAt: b.text('completedAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    connectionIdIdx: b.index('IntegrationSyncLog_connectionId_idx').on(table.connectionId),
    orgIdIdx: b.index('IntegrationSyncLog_orgId_idx').on(table.orgId),
    connectionStartedIdx: b.index('IntegrationSyncLog_connectionId_startedAt_idx').on(table.connectionId, table.startedAt),
  }));

  return {
    ...core,
    ...pro,
    ...socialAuth,
    userProfile: userProfileTable,
    apiKeys: apiKeysTable,
    dashboardLayouts: dashboardLayoutsTable,
    notifications: notificationsTable,
    slackConnections: slackConnectionsTable,
    notificationPreferences: notificationPreferencesTable,
    pushSubscriptions: pushSubscriptionsTable,
    aiConnections: aiConnectionsTable,
    integrationConnections: integrationConnectionsTable,
    integrationSyncLogs: integrationSyncLogsTable,
  };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _start = createStartSchema();
export const userProfile = _start.userProfile;
export const apiKeys = _start.apiKeys;
export const dashboardLayouts = _start.dashboardLayouts;
export const notifications = _start.notifications;
export const slackConnections = _start.slackConnections;
export const notificationPreferences = _start.notificationPreferences;
export const pushSubscriptions = _start.pushSubscriptions;
export const aiConnections = _start.aiConnections;
export const integrationConnections = _start.integrationConnections;
export const integrationSyncLogs = _start.integrationSyncLogs;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserProfile = typeof userProfile.$inferSelect;
export type NewUserProfile = typeof userProfile.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type SlackConnection = typeof slackConnections.$inferSelect;
export type NewSlackConnection = typeof slackConnections.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

export type AiConnection = typeof aiConnections.$inferSelect;
export type NewAiConnection = typeof aiConnections.$inferInsert;

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type NewDashboardLayout = typeof dashboardLayouts.$inferInsert;

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection = typeof integrationConnections.$inferInsert;

export type IntegrationSyncLog = typeof integrationSyncLogs.$inferSelect;
export type NewIntegrationSyncLog = typeof integrationSyncLogs.$inferInsert;
