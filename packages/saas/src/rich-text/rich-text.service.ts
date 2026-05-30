/**
 * Rich Text Service
 *
 * Manages rich text content storage, retrieval, and search.
 * Content is stored per entity+field with HTML sanitization and
 * plain text extraction for search.
 */

import { Injectable, Inject, DRIZZLE, type DrizzleDatabase } from '@cruzjs/core';
import { eq, and, like, desc } from 'drizzle-orm';
import { richTextContents, richTextAttachments } from './rich-text.schema';
import type { RichTextContentRow, RichTextAttachmentRow } from './rich-text.schema';
import type { SaveRichTextInput } from './rich-text.types';
import { HtmlSanitizer } from './html-sanitizer';
import { MentionResolver } from './mention.resolver';

@Injectable()
export class RichTextService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(MentionResolver) private readonly mentions: MentionResolver,
  ) {}

  /**
   * Save or update rich text content for an entity field.
   * Upserts based on (entityType, entityId, field) uniqueness.
   */
  async save(input: SaveRichTextInput): Promise<RichTextContentRow> {
    const { body, plainText } = this.sanitizeAndExtract(input.body);

    // Resolve mentions in the sanitized HTML
    const resolvedBody = await this.mentions.resolveMentions(body);

    // Check for existing content
    const existing = await this.get(input.entityType, input.entityId, input.field);

    if (existing) {
      // Update existing content with version bump
      const [updated] = await this.db
        .update(richTextContents)
        .set({
          body: resolvedBody,
          plainText,
          version: existing.version + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(richTextContents.id, existing.id))
        .returning();
      return updated;
    }

    // Create new content
    const [created] = await this.db
      .insert(richTextContents)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field ?? 'body',
        body: resolvedBody,
        plainText,
        metadata: '{}',
        version: 1,
      })
      .returning();
    return created;
  }

  /**
   * Get content for an entity field.
   */
  async get(entityType: string, entityId: string, field?: string): Promise<RichTextContentRow | null> {
    const conditions = [
      eq(richTextContents.entityType, entityType),
      eq(richTextContents.entityId, entityId),
    ];

    if (field) {
      conditions.push(eq(richTextContents.field, field));
    }

    const [content] = await this.db
      .select()
      .from(richTextContents)
      .where(and(...conditions))
      .limit(1);

    return content ?? null;
  }

  /**
   * Get all content fields for an entity.
   */
  async getAll(entityType: string, entityId: string): Promise<RichTextContentRow[]> {
    return this.db
      .select()
      .from(richTextContents)
      .where(and(
        eq(richTextContents.entityType, entityType),
        eq(richTextContents.entityId, entityId),
      ))
      .orderBy(desc(richTextContents.createdAt));
  }

  /**
   * Delete content (attachments cascade via FK).
   */
  async delete(entityType: string, entityId: string, field?: string): Promise<void> {
    const conditions = [
      eq(richTextContents.entityType, entityType),
      eq(richTextContents.entityId, entityId),
    ];

    if (field) {
      conditions.push(eq(richTextContents.field, field));
    }

    await this.db
      .delete(richTextContents)
      .where(and(...conditions));
  }

  /**
   * Get attachments for a content record.
   */
  async getAttachments(contentId: string): Promise<RichTextAttachmentRow[]> {
    return this.db
      .select()
      .from(richTextAttachments)
      .where(eq(richTextAttachments.contentId, contentId));
  }

  /**
   * Save an attachment reference (after upload via UploadService).
   */
  async saveAttachment(
    contentId: string,
    attachment: Omit<RichTextAttachmentRow, 'id' | 'createdAt'>,
  ): Promise<RichTextAttachmentRow> {
    const [created] = await this.db
      .insert(richTextAttachments)
      .values({
        contentId,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        contentType: attachment.contentType,
        storageKey: attachment.storageKey,
        width: attachment.width,
        height: attachment.height,
        altText: attachment.altText,
      })
      .returning();
    return created;
  }

  /**
   * Delete an attachment.
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.db
      .delete(richTextAttachments)
      .where(eq(richTextAttachments.id, attachmentId));
  }

  /**
   * Search in rich text content (simple text match on plainText).
   */
  async search(query: string, entityType?: string): Promise<RichTextContentRow[]> {
    const searchPattern = `%${query}%`;

    const conditions = [like(richTextContents.plainText, searchPattern)];
    if (entityType) {
      conditions.push(eq(richTextContents.entityType, entityType));
    }

    return this.db
      .select()
      .from(richTextContents)
      .where(and(...conditions))
      .orderBy(desc(richTextContents.updatedAt))
      .limit(50);
  }

  /**
   * Sanitize HTML and extract plain text.
   */
  private sanitizeAndExtract(html: string): { body: string; plainText: string } {
    const body = HtmlSanitizer.sanitize(html);
    const plainText = HtmlSanitizer.extractText(body);
    return { body, plainText };
  }
}
