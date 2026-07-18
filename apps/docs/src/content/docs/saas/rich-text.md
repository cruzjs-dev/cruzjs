---
title: Rich Text
description: Entity-scoped rich text content with HTML sanitization, mentions, and full-text search in CruzJS Pro
---

`@cruzjs/saas` includes a rich text module for storing and managing HTML content associated with entities. It handles HTML sanitization, @mention resolution, attachment tracking, and full-text search integration.

## Setup

Register the `RichTextModule` in your application:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { RichTextModule } from '@cruzjs/saas/rich-text/rich-text.module';

registerModules([StartModule, RichTextModule]);
```

## Entity-Scoped Content

Rich text content is associated with a specific entity through three identifiers: `entityType`, `entityId`, and `fieldName`. This allows multiple rich text fields per entity.

```typescript
// Save rich text for an article's body field
trpc.richText.save.useMutation().mutate({
  entityType: 'article',
  entityId: 'art_abc123',
  fieldName: 'body',
  htmlContent: '<p>This is the article body with <strong>formatting</strong>.</p>',
});
```

### SaveRichTextInput

```typescript
type SaveRichTextInput = {
  entityType: string;   // e.g. 'article', 'comment', 'page'
  entityId: string;     // ID of the parent entity
  fieldName: string;    // e.g. 'body', 'description', 'notes'
  htmlContent: string;  // Raw HTML content
};
```

## HTML Sanitization

All HTML content is sanitized on save using an allowlist of safe tags. The sanitizer is compatible with Cloudflare Workers (no DOM APIs required).

Allowed tags include standard formatting elements: `p`, `strong`, `em`, `a`, `ul`, `ol`, `li`, `h1`-`h6`, `blockquote`, `code`, `pre`, `img`, `br`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`.

Script tags, event handlers, and other potentially dangerous content are stripped automatically.

## @Mention Resolution

The rich text module supports @mentions that reference users or organizations. During save, mention tokens are resolved and replaced with linked anchor tags:

```html
<!-- Input -->
<p>Hey @john, please review this.</p>

<!-- Output (after mention resolution) -->
<p>Hey <a href="/users/user_john" class="mention" data-mention-id="user_john">@John Smith</a>, please review this.</p>
```

## Attachment Tracking

Associate file attachments with rich text content:

```typescript
// Add an attachment
trpc.richText.addAttachment.useMutation().mutate({
  entityType: 'article',
  entityId: 'art_abc123',
  fieldName: 'body',
  fileId: 'file_xyz789',
});

// Remove an attachment
trpc.richText.removeAttachment.useMutation().mutate({
  entityType: 'article',
  entityId: 'art_abc123',
  fieldName: 'body',
  fileId: 'file_xyz789',
});
```

Attachment records track which files are referenced in which rich text fields, enabling cleanup when content is deleted or files are removed.

## Full-Text Search

If the `SearchModule` is also registered, rich text content is automatically indexed for full-text search:

```typescript
const results = trpc.richText.search.useQuery({
  query: 'typescript patterns',
  entityType: 'article', // optional filter
});
```

The search indexes the plain text extracted from the HTML content, stripping all tags.

## Plain Text Extraction

The module extracts plain text from HTML for use in notifications, previews, and search indexing. This is done server-side without DOM APIs.

```typescript
// Stored HTML: <p>Hello <strong>world</strong></p>
// Extracted text: "Hello world"
```

## tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `richText.get` | query | Get rich text content for an entity field |
| `richText.save` | mutation | Save (create or update) rich text content |
| `richText.search` | query | Full-text search across rich text content |
| `richText.addAttachment` | mutation | Associate a file with rich text content |
| `richText.removeAttachment` | mutation | Remove a file association |

## Example: Article Editor

```typescript
import { RichTextEditor } from '@cruzjs/ui';

function ArticleEditor({ articleId }: { articleId: string }) {
  const { data } = trpc.richText.get.useQuery({
    entityType: 'article',
    entityId: articleId,
    fieldName: 'body',
  });

  const save = trpc.richText.save.useMutation();

  return (
    <RichTextEditor
      value={data?.htmlContent ?? ''}
      onChange={(html) => {
        save.mutate({
          entityType: 'article',
          entityId: articleId,
          fieldName: 'body',
          htmlContent: html,
        });
      }}
    />
  );
}
```

The `RichTextEditor` UI component is provided by `@cruzjs/ui`. The rich text _storage and backend_ (sanitization, mentions, search) is provided by `@cruzjs/saas`.
