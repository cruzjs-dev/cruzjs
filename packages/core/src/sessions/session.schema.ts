/**
 * Session Management Database Schema
 *
 * Tracks active user sessions with token hashes, device info, and expiry.
 * System-level table (no org scoping) since sessions are per-user.
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createSessionSchema = DrizzleUniversalFactory.create((b) => {
  const managedSessionsTable = b.table('ManagedSessions', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    userId: b.text('user_id').notNull(),
    tokenHash: b.text('token_hash').notNull().unique(),
    ipAddress: b.text('ip_address'),
    userAgent: b.text('user_agent'),
    deviceFingerprint: b.text('device_fingerprint'),
    deviceLabel: b.text('device_label'),
    lastActiveAt: b.dateTimestamp('last_active_at').notNull(),
    expiresAt: b.dateTimestamp('expires_at').notNull(),
    revokedAt: b.dateTimestamp('revoked_at'),
    metadata: b.json<Record<string, unknown>>('metadata').default({}),
    createdAt: b.dateTimestamp('created_at').notNull().$defaultFn(() => new Date()),
  }, (table: any) => ({
    userIdIdx: b.index('ManagedSessions_user_id_idx').on(table.userId),
    tokenHashIdx: b.uniqueIndex('ManagedSessions_token_hash_idx').on(table.tokenHash),
  }));

  return { managedSessions: managedSessionsTable };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createSessionSchema();
export const managedSessions = _s.managedSessions;

// ─── Type Exports ───────────────────────────────────────────────────────────

export type ManagedSession = typeof managedSessions.$inferSelect;
export type NewManagedSession = typeof managedSessions.$inferInsert;
