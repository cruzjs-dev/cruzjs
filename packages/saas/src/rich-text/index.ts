/**
 * Rich Text / Action Text
 *
 * Entity-scoped rich text content storage with HTML sanitization,
 * @mention resolution, and attachment tracking.
 */

// Types
export type {
  RichTextContent,
  RichTextAttachment,
  SaveRichTextInput,
  MentionTarget,
} from './rich-text.types';
export { ALLOWED_HTML_TAGS } from './rich-text.types';

// Schema
export {
  richTextContents,
  richTextAttachments,
  richTextContentsRelations,
  richTextAttachmentsRelations,
} from './rich-text.schema';
export type {
  RichTextContentRow,
  NewRichTextContent,
  RichTextAttachmentRow,
  NewRichTextAttachment,
} from './rich-text.schema';

// Validation
export {
  saveRichTextSchema,
  getRichTextSchema,
  deleteRichTextSchema,
  searchMentionsSchema,
  getAttachmentsSchema,
  deleteAttachmentSchema,
  searchRichTextSchema,
} from './rich-text.validation';

// Service
export { RichTextService } from './rich-text.service';

// Sanitizer
export { HtmlSanitizer } from './html-sanitizer';
export type { SanitizeOptions } from './html-sanitizer';

// Mention Resolver
export { MentionResolver } from './mention.resolver';

// tRPC
export { RichTextTrpc } from './rich-text.trpc';

// Module
export { RichTextModule } from './rich-text.module';
