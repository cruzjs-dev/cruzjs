/**
 * @cruzjs/saas - Premium Package
 *
 * Contains: Billing, Admin Dashboard, Audit Logging
 *
 * Organizations, members, roles, and permissions are now in @cruzjs/start.
 * Org schema tables are in @cruzjs/core/database/schema.
 * Org services are in @cruzjs/start/orgs/.
 */

// Re-export org types from core for backwards compatibility
export type {
  Organization,
  NewOrganization,
  OrgRole,
  OrgRoleLower,
} from '@cruzjs/core/database/schema';

export { OrgRoleValues, OrgRoleLowercase } from '@cruzjs/core/database/schema';

// Re-export OrgContext (org-scoped state management)
export {
  OrgProvider,
  useOrgContext,
  registerOrgIdGetter,
  getCurrentOrgId,
} from './contexts/OrgContext';

// Rich Text / Action Text
export {
  RichTextService,
  HtmlSanitizer,
  MentionResolver,
  RichTextTrpc,
  RichTextModule,
  richTextContents,
  richTextAttachments,
  richTextContentsRelations,
  richTextAttachmentsRelations,
  ALLOWED_HTML_TAGS,
  saveRichTextSchema,
  getRichTextSchema,
  deleteRichTextSchema,
  searchMentionsSchema,
  getAttachmentsSchema,
  deleteAttachmentSchema,
  searchRichTextSchema,
} from './rich-text';
export type {
  RichTextContent,
  RichTextAttachment,
  SaveRichTextInput,
  MentionTarget,
  RichTextContentRow,
  NewRichTextContent,
  RichTextAttachmentRow,
  NewRichTextAttachment,
  SanitizeOptions,
} from './rich-text';
