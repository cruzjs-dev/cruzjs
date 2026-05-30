/**
 * Rich Text / Action Text Types
 *
 * Core types for the rich text content system. Supports entity-field based
 * content storage with attachments and @mentions.
 */

export interface RichTextContent {
  id: string;
  entityType: string; // e.g., 'post', 'comment', 'description'
  entityId: string;
  field: string; // field name on the entity (e.g., 'body', 'content')
  body: string; // sanitized HTML
  plainText: string; // extracted plain text for search/preview
  metadata: Record<string, unknown>;
  version: number; // for optimistic concurrency
  createdAt: Date;
  updatedAt: Date;
}

export interface RichTextAttachment {
  id: string;
  contentId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: Date;
}

export interface SaveRichTextInput {
  entityType: string;
  entityId: string;
  field: string;
  body: string; // raw HTML from editor
}

export interface MentionTarget {
  id: string;
  type: 'user' | 'org';
  name: string;
  avatarUrl: string | null;
}

export const ALLOWED_HTML_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'hr',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div',
] as const satisfies readonly string[];
