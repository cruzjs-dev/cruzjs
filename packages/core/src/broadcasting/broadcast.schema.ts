/**
 * Broadcast Presence Database Schema
 *
 * Tracks presence membership across channels.
 * System-level table (no org scoping) since presence is per-user.
 */

import { createId } from '@paralleldrive/cuid2';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createBroadcastSchema = DrizzleUniversalFactory.create((b) => {
  const broadcastPresenceTable = b.table('BroadcastPresence', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    channel: b.text('channel').notNull(),
    userId: b.text('userId').notNull(),
    metadata: b.json('metadata'),
    joinedAt: b.dateTimestamp('joinedAt').notNull().$defaultFn(() => new Date()),
  }, (table: any) => ({
    channelIdx: b.index('BroadcastPresence_channel_idx').on(table.channel),
    channelUserUniq: b.uniqueIndex('BroadcastPresence_channel_user_uniq').on(table.channel, table.userId),
  }));

  return { broadcastPresence: broadcastPresenceTable };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createBroadcastSchema();
export const broadcastPresence = _s.broadcastPresence;

// ─── Type Exports ───────────────────────────────────────────────────────────

export type BroadcastPresenceRecord = typeof broadcastPresence.$inferSelect;
export type NewBroadcastPresenceRecord = typeof broadcastPresence.$inferInsert;

// ─── Broadcast Messages (for DatabaseSSEBackend polling) ─────────────────────

export const createBroadcastMessagesSchema = DrizzleUniversalFactory.create((b) => {
  const broadcastMessagesTable = b.table('BroadcastMessages', {
    id: b.text('id').primaryKey(),
    channel: b.text('channel').notNull(),
    event: b.text('event').notNull(),
    data: b.json('data'),
    timestamp: b.text('timestamp').notNull(),
    expiresAt: b.dateTimestamp('expiresAt').notNull(),
  }, (table: any) => ({
    channelTimestampIdx: b.index('BroadcastMessages_channel_timestamp_idx').on(table.channel, table.timestamp),
    expiresAtIdx: b.index('BroadcastMessages_expiresAt_idx').on(table.expiresAt),
  }));

  return { broadcastMessages: broadcastMessagesTable };
});

const _bm = createBroadcastMessagesSchema();
export const broadcastMessages = _bm.broadcastMessages;

export type BroadcastMessageRecord = typeof broadcastMessages.$inferSelect;
export type NewBroadcastMessageRecord = typeof broadcastMessages.$inferInsert;
