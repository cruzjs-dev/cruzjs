/**
 * Social Auth Database Schema
 *
 * Stores OAuth provider connections linked to user accounts.
 * Each user can have one connection per provider.
 *
 * Tokens are encrypted with AES-256-GCM before storage.
 * The accessTokenIv and refreshTokenIv columns store the IV for each.
 */

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { authIdentity } from '@cruzjs/core/database/schema';
import { DrizzleUniversalFactory, fkRef } from '@cruzjs/drizzle-universal';
import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createSocialAuthSchema = DrizzleUniversalFactory.create(
  (b: UniversalBuilder, refs: { authIdentity: TableRef<{ id: string }> }) => {
  const socialAccountsTable = b.table('SocialAccount', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull().references(() => fkRef(refs.authIdentity.id), { onDelete: 'cascade' }),
    provider: b.text('provider').notNull(),
    providerUserId: b.text('providerUserId').notNull(),
    email: b.text('email'),
    displayName: b.text('displayName'),
    avatarUrl: b.text('avatarUrl'),
    username: b.text('username'),
    accessToken: b.text('accessToken'),
    accessTokenIv: b.text('accessTokenIv'),
    refreshToken: b.text('refreshToken'),
    refreshTokenIv: b.text('refreshTokenIv'),
    tokenExpiresAt: b.text('tokenExpiresAt'),
    scopes: b.text('scopes'),
    metadata: b.text('metadata').default('{}'),
    lastSyncedAt: b.text('lastSyncedAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    userIdIdx: b.index('SocialAccount_userId_idx').on(table.userId),
    providerUserUniq: b.uniqueIndex('SocialAccount_provider_providerUserId_uniq').on(table.provider, table.providerUserId),
    userProviderUniq: b.uniqueIndex('SocialAccount_userId_provider_uniq').on(table.userId, table.provider),
  }));

  const socialAccountsRels = relations(socialAccountsTable, ({ one }) => ({
    user: one(refs.authIdentity, { fields: [socialAccountsTable.userId], references: [refs.authIdentity.id] }),
  }));

  return {
    socialAccounts: socialAccountsTable,
    socialAccountsRelations: socialAccountsRels,
  };
},
);

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createSocialAuthSchema({ authIdentity });
export const socialAccounts = _s.socialAccounts;
export const socialAccountsRelations = _s.socialAccountsRelations;

// Type exports
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type NewSocialAccount = typeof socialAccounts.$inferInsert;
