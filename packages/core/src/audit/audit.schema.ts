/**
 * Audit Log Database Schema
 *
 * Stores audit trail entries for all tracked actions.
 * Supports org-scoped queries as well as cross-org actor history.
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createAuditSchema = DrizzleUniversalFactory.create((b) => {
  const auditLogsTable = b.table('AuditLog', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    action: b.text('action').notNull(),
    entityType: b.text('entityType').notNull(),
    entityId: b.text('entityId'),
    actorId: b.text('actorId'),
    actorType: b.text('actorType').notNull().default('user'),
    orgId: b.text('orgId'),
    before: b.json<Record<string, unknown>>('before'),
    after: b.json<Record<string, unknown>>('after'),
    diff: b.json<Record<string, unknown>>('diff'),
    ipAddress: b.text('ipAddress'),
    userAgent: b.text('userAgent'),
    metadata: b.json<Record<string, unknown>>('metadata').default({}),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    orgIdIdx: b.index('AuditLog_orgId_idx').on(table.orgId),
    actorIdIdx: b.index('AuditLog_actorId_idx').on(table.actorId),
    entityIdx: b.index('AuditLog_entityType_entityId_idx').on(table.entityType, table.entityId),
    actionIdx: b.index('AuditLog_action_idx').on(table.action),
    createdAtIdx: b.index('AuditLog_createdAt_idx').on(table.createdAt),
  }));

  return { auditLogs: auditLogsTable };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createAuditSchema();
export const auditLogs = _s.auditLogs;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
