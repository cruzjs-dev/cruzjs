/**
 * Rich Text Database Schema
 *
 * Tables for rich text content and attachment tracking.
 * Uses text-mode timestamps (ISO8601 strings) to match core schema conventions.
 */

import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

// ─── Dialect-Agnostic Factory ────────────────────────────────────────────────

export const createRichTextSchema = DrizzleUniversalFactory.create((b) => {
  const richTextContentsTable = b.table('RichTextContent', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    entityType: b.text('entityType').notNull(),
    entityId: b.text('entityId').notNull(),
    field: b.text('field').notNull().default('body'),
    body: b.text('body').notNull().default(''),
    plainText: b.text('plainText').notNull().default(''),
    metadata: b.text('metadata').notNull().default('{}'),
    version: b.integer('version').notNull().default(1),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    uniqueEntityField: b.uniqueIndex('RichTextContent_entity_field_unique').on(table.entityType, table.entityId, table.field),
    entityIdx: b.index('RichTextContent_entity_idx').on(table.entityType, table.entityId),
  }));

  const richTextAttachmentsTable = b.table('RichTextAttachment', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    contentId: b.text('contentId').notNull().references(() => richTextContentsTable.id, { onDelete: 'cascade' }),
    fileName: b.text('fileName').notNull(),
    fileSize: b.integer('fileSize').notNull(),
    contentType: b.text('contentType').notNull(),
    storageKey: b.text('storageKey').notNull(),
    width: b.integer('width'),
    height: b.integer('height'),
    altText: b.text('altText'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table: any) => ({
    contentIdIdx: b.index('RichTextAttachment_contentId_idx').on(table.contentId),
  }));

  const richTextContentsRels = relations(richTextContentsTable, ({ many }) => ({
    attachments: many(richTextAttachmentsTable),
  }));

  const richTextAttachmentsRels = relations(richTextAttachmentsTable, ({ one }) => ({
    content: one(richTextContentsTable, { fields: [richTextAttachmentsTable.contentId], references: [richTextContentsTable.id] }),
  }));

  return {
    richTextContents: richTextContentsTable,
    richTextAttachments: richTextAttachmentsTable,
    richTextContentsRelations: richTextContentsRels,
    richTextAttachmentsRelations: richTextAttachmentsRels,
  };
});

// ─── Named convenience exports ──────────────────────────────────────────────

const _s = createRichTextSchema();
export const richTextContents = _s.richTextContents;
export const richTextAttachments = _s.richTextAttachments;
export const richTextContentsRelations = _s.richTextContentsRelations;
export const richTextAttachmentsRelations = _s.richTextAttachmentsRelations;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RichTextContentRow = typeof richTextContents.$inferSelect;
export type NewRichTextContent = typeof richTextContents.$inferInsert;

export type RichTextAttachmentRow = typeof richTextAttachments.$inferSelect;
export type NewRichTextAttachment = typeof richTextAttachments.$inferInsert;
