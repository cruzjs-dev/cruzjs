import { protectedProcedure, router } from '../trpc/context';
import { UploadService } from './upload.service';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { UploadType } from './upload.models';

export const uploadTrpc = router({
  /**
   * Create upload URL
   */
  create: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        contentType: z.string(),
        fileSize: z.number().positive(),
        uploadType: z
          .enum(['avatar', 'document', 'image', 'video', 'general'])
          .default('general'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const uploadService = ctx.container.get<UploadService>(UploadService);
      const upload = await uploadService.requestUpload(
        {
          userId: ctx.session.user.id,
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
        },
        input.uploadType as UploadType
      );

      return upload;
    }),

  /**
   * Confirm upload completion
   */
  confirm: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        key: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const uploadService = ctx.container.get<UploadService>(UploadService);
      const file = await uploadService.confirmUpload({
        uploadId: input.uploadId,
        key: input.key,
      });

      return file;
    }),

  /**
   * Get upload by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const uploadService = ctx.container.get<UploadService>(UploadService);
      const file = await uploadService.getUpload(input.id);

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        });
      }

      return file;
    }),
});
