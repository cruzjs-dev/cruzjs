/**
 * Two-Factor Authentication Database Schema
 *
 * Tables:
 * - TwoFactorSecret: per-user 2FA method configuration (TOTP secret, phone, email)
 * - TrustedDevice: devices that bypass 2FA for a period
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';

const generateId = () => createId();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createTwoFactorSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { authIdentity: TableRef<{ id: string }> }) => {
  const twoFactorSecretsTable = b.table('TwoFactorSecret', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
    method: b.text('method').notNull(),
    secret: b.text('secret').notNull(),
    backupCodes: b.json<string[]>('backupCodes'),
    verified: b.boolean('verified').notNull().default(false),
    enabledAt: b.dateTimestamp('enabledAt'),
    lastUsedAt: b.dateTimestamp('lastUsedAt'),
    createdAt: b.dateTimestamp('createdAt').notNull().$defaultFn(() => new Date()),
  }, (table: any) => ({
    userIdIdx: b.index('TwoFactorSecret_userId_idx').on(table.userId),
    userMethodIdx: b.index('TwoFactorSecret_userId_method_idx').on(table.userId, table.method),
  }));

  const trustedDevicesTable = b.table('TrustedDevice', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
    deviceFingerprint: b.text('deviceFingerprint').notNull(),
    label: b.text('label').notNull(),
    trustedUntil: b.dateTimestamp('trustedUntil').notNull(),
    createdAt: b.dateTimestamp('createdAt').notNull().$defaultFn(() => new Date()),
  }, (table: any) => ({
    userIdIdx: b.index('TrustedDevice_userId_idx').on(table.userId),
    userFingerprintIdx: b.index('TrustedDevice_userId_fingerprint_idx').on(table.userId, table.deviceFingerprint),
  }));

  return {
    twoFactorSecrets: twoFactorSecretsTable,
    trustedDevices: trustedDevicesTable,
  };
},
);

// ─── Re-export from database/schema (source of truth for table instances) ────

export { twoFactorSecrets, trustedDevices } from '../database/schema';

// ============================================================================
// TYPE EXPORTS (derived from factory return type to avoid circular deps)
// ============================================================================

type TwoFactorSchemaResult = ReturnType<typeof createTwoFactorSchema>;
export type TwoFactorSecretRow = TwoFactorSchemaResult['twoFactorSecrets']['$inferSelect'];
export type NewTwoFactorSecret = TwoFactorSchemaResult['twoFactorSecrets']['$inferInsert'];

export type TrustedDeviceRow = TwoFactorSchemaResult['trustedDevices']['$inferSelect'];
export type NewTrustedDevice = TwoFactorSchemaResult['trustedDevices']['$inferInsert'];
