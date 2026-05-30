/**
 * Admin Impersonation — SCHEMA ONLY
 *
 * Table split out of admin.impersonation.ts so the database/schema barrel can
 * import the table WITHOUT pulling in the decorated ImpersonationService.
 * drizzle-kit bundles the schema graph with esbuild, which cannot transform
 * parameter decorators — keeping this file decorator-free is what lets
 * `cruz db generate` succeed.
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';
import { authIdentity } from '@cruzjs/core/database/schema';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createImpersonationSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { authIdentity: TableRef<{ id: string }> }) => {
  const impersonationTokensTable = b.table(
    'ImpersonationToken',
    {
      id: b.text('id').primaryKey().$defaultFn(generateId),
      targetUserId: b.text('targetUserId').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
      adminUserId: b.text('adminUserId').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
      token: b.text('token').notNull().unique(),
      expiresAt: b.text('expiresAt').notNull(),
      usedAt: b.text('usedAt'),
      createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    },
    (table: any) => ({
      tokenIdx: b.uniqueIndex('ImpersonationToken_token_idx').on(table.token),
      adminIdx: b.index('ImpersonationToken_adminUserId_idx').on(table.adminUserId),
      targetIdx: b.index('ImpersonationToken_targetUserId_idx').on(table.targetUserId),
    }),
  );

  return { impersonationTokens: impersonationTokensTable };
},
);

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createImpersonationSchema({ authIdentity });
export const impersonationTokens = _s.impersonationTokens;

export type ImpersonationToken = typeof impersonationTokens.$inferSelect;
export type NewImpersonationToken = typeof impersonationTokens.$inferInsert;
