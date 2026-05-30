/**
 * Rich Text Validation Schemas
 */

import { z } from 'zod';

export const saveRichTextSchema = z.object({
  entityType: z.string().min(1).max(100).trim(),
  entityId: z.string().min(1).max(100).trim(),
  field: z.string().min(1).max(100).trim().default('body'),
  body: z.string().max(500_000), // 500KB max HTML
});

export const getRichTextSchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  field: z.string().min(1).max(100).optional(),
});

export const deleteRichTextSchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  field: z.string().min(1).max(100).optional(),
});

export const searchMentionsSchema = z.object({
  query: z.string().min(1).max(100).trim(),
  orgId: z.string().min(1),
});

export const getAttachmentsSchema = z.object({
  contentId: z.string().min(1),
});

export const deleteAttachmentSchema = z.object({
  attachmentId: z.string().min(1),
});

export const searchRichTextSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  entityType: z.string().min(1).max(100).optional(),
});

export type SaveRichTextInput = z.infer<typeof saveRichTextSchema>;
export type GetRichTextInput = z.infer<typeof getRichTextSchema>;
export type DeleteRichTextInput = z.infer<typeof deleteRichTextSchema>;
export type SearchMentionsInput = z.infer<typeof searchMentionsSchema>;
