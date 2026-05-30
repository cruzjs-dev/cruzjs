/**
 * Chatbots tRPC router — app-owned, user-scoped CRUD.
 *
 * Plain router (no DI service) querying D1 via the DRIZZLE token. Kept minimal
 * on purpose; see `createCrud` in @cruzjs/core for the full DRF-style factory.
 */

import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { protectedProcedure, router } from '@cruzjs/core/trpc/context';
import type { DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { chatbots } from '../database/chatbots.schema';

// Resolve the DB by its DI token symbol WITHOUT a static value import of
// drizzle.service — that module dynamically imports the node-only local-db,
// which must never enter the client bundle. createToken('DrizzleDatabase')
// === Symbol.for('DrizzleDatabase').
const DRIZZLE = Symbol.for('DrizzleDatabase');

const createInput = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().max(2000).optional(),
  model: z.string().max(100).optional(),
});

export const chatbotsTrpc = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.container.get<DrizzleDatabase>(DRIZZLE);
    return db
      .select()
      .from(chatbots)
      .where(eq(chatbots.ownerId, ctx.session!.user.id))
      .orderBy(desc(chatbots.createdAt));
  }),

  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const db = ctx.container.get<DrizzleDatabase>(DRIZZLE);
    const [bot] = await db
      .insert(chatbots)
      .values({
        ownerId: ctx.session!.user.id,
        name: input.name,
        systemPrompt: input.systemPrompt ?? 'You are a helpful assistant.',
        model: input.model ?? 'openai/gpt-4o-mini',
      })
      .returning();
    return bot;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.container.get<DrizzleDatabase>(DRIZZLE);
      await db
        .delete(chatbots)
        .where(and(eq(chatbots.id, input.id), eq(chatbots.ownerId, ctx.session!.user.id)));
      return { success: true as const };
    }),
});
