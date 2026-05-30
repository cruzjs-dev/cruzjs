/**
 * PDFs tRPC router — app-owned, user-scoped.
 *
 * Thin router: all heavy/server-only work lives in `server/pdf.service.ts`,
 * resolved lazily via Symbol.for('PdfService'). Only a *type* import of the
 * service is used here, so no server-only code enters the client bundle
 * (same discipline as chatbots.trpc.ts and the DRIZZLE token).
 */

import { z } from 'zod';
import { protectedProcedure, router } from '@cruzjs/core/trpc/context';
import type { PdfService } from '../server/pdf.service';

const PDF_SERVICE = Symbol.for('PdfService');

// ~10 MB file => ~13.4 MB base64.
const MAX_BASE64 = 14_000_000;

const chatTurn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const pdfsTrpc = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.container.get<PdfService>(PDF_SERVICE).list(ctx.session!.user.id)
  ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.container.get<PdfService>(PDF_SERVICE).get(ctx.session!.user.id, input.id)
    ),

  upload: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        dataBase64: z.string().min(1).max(MAX_BASE64),
      })
    )
    .mutation(({ ctx, input }) => {
      const binary = atob(input.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return ctx.container
        .get<PdfService>(PDF_SERVICE)
        .upload(ctx.session!.user.id, input.name, bytes);
    }),

  chat: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        message: z.string().min(1).max(2000),
        history: z.array(chatTurn).default([]),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.container
        .get<PdfService>(PDF_SERVICE)
        .chat(ctx.session!.user.id, input.id, input.message, input.history)
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.container.get<PdfService>(PDF_SERVICE).remove(ctx.session!.user.id, input.id)
    ),
});
