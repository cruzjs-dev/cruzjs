/**
 * Magic Link Schema
 *
 * Table for storing magic link tokens.
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createMagicLinkSchema = DrizzleUniversalFactory.create((b) => {
  const magicLinksTable = b.table('MagicLink', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    userId: b.text('user_id'),
    email: b.text('email').notNull(),
    tokenHash: b.text('token_hash').notNull().unique(),
    expiresAt: b.dateTimestamp('expires_at').notNull(),
    usedAt: b.dateTimestamp('used_at'),
    ipAddress: b.text('ip_address'),
    redirectTo: b.text('redirect_to'),
    createdAt: b.dateTimestamp('created_at').notNull().$defaultFn(() => new Date()),
  }, (table: any) => ({
    emailIdx: b.index('MagicLink_email_idx').on(table.email),
    tokenHashIdx: b.uniqueIndex('MagicLink_tokenHash_idx').on(table.tokenHash),
  }));

  return { magicLinks: magicLinksTable };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createMagicLinkSchema();
export const magicLinks = _s.magicLinks;

export type MagicLinkRow = typeof magicLinks.$inferSelect;
export type NewMagicLinkRow = typeof magicLinks.$inferInsert;
