/**
 * Rich Text Module
 *
 * Provides rich text content storage, HTML sanitization, mention resolution,
 * and attachment tracking.
 */

import { Module } from '@cruzjs/core';
import { RichTextService } from './rich-text.service';
import { MentionResolver } from './mention.resolver';
import { RichTextTrpc } from './rich-text.trpc';

@Module({
  providers: [
    RichTextService,
    MentionResolver,
    RichTextTrpc,
  ],
  trpcRouters: {
    richText: RichTextTrpc,
  },
})
export class RichTextModule {}
