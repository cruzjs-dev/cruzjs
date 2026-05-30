/**
 * Rich Text tRPC Router
 *
 * Protected procedures for rich text content CRUD, mention search,
 * and attachment management.
 */

import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { RichTextService } from './rich-text.service';
import { MentionResolver } from './mention.resolver';
import {
  saveRichTextSchema,
  getRichTextSchema,
  deleteRichTextSchema,
  searchMentionsSchema,
  getAttachmentsSchema,
  deleteAttachmentSchema,
  searchRichTextSchema,
} from './rich-text.validation';

@Router()
export class RichTextTrpc extends TrpcRouter {
  @Inject(RichTextService) private service!: RichTextService;
  @Inject(MentionResolver) private mentionResolver!: MentionResolver;

  @Route() get = protectedProcedure
    .input(getRichTextSchema)
    .query(async ({ input }) =>
      this.service.get(input.entityType, input.entityId, input.field));

  @Route() save = protectedProcedure
    .input(saveRichTextSchema)
    .mutation(async ({ input }) =>
      this.service.save(input));

  @Route() delete = protectedProcedure
    .input(deleteRichTextSchema)
    .mutation(async ({ input }) => {
      await this.service.delete(input.entityType, input.entityId, input.field);
      return { success: true };
    });

  @Route() search = protectedProcedure
    .input(searchRichTextSchema)
    .query(async ({ input }) =>
      this.service.search(input.query, input.entityType));

  @Route() searchMentions = protectedProcedure
    .input(searchMentionsSchema)
    .query(async ({ input }) =>
      this.mentionResolver.search(input.query, input.orgId));

  @Route() getAttachments = protectedProcedure
    .input(getAttachmentsSchema)
    .query(async ({ input }) =>
      this.service.getAttachments(input.contentId));

  @Route() deleteAttachment = protectedProcedure
    .input(deleteAttachmentSchema)
    .mutation(async ({ input }) => {
      await this.service.deleteAttachment(input.attachmentId);
      return { success: true };
    });
}
