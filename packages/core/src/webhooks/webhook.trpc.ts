/**
 * Webhook tRPC Router
 *
 * Org-scoped CRUD, delivery listing, redelivery, and test endpoints.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { Inject } from '../di';
import { orgProcedure } from '../trpc/context';
import { WebhookService } from './webhook.service';
import { createWebhookSchema, updateWebhookSchema } from './webhook.validation';

@Router()
export class WebhookTrpc extends TrpcRouter {
  @Inject(WebhookService) private service!: WebhookService;

  @Route() create = orgProcedure
    .input(createWebhookSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.create(ctx.org.org.orgId, ctx.org.user.id, input));

  @Route() list = orgProcedure
    .query(async ({ ctx }) =>
      this.service.list(ctx.org.org.orgId));

  @Route() get = orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const webhook = await this.service.get(ctx.org.org.orgId, input.id);
      if (!webhook) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      return webhook;
    });

  @Route() update = orgProcedure
    .input(z.object({ id: z.string(), data: updateWebhookSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await this.service.get(ctx.org.org.orgId, input.id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      return this.service.update(ctx.org.org.orgId, input.id, input.data);
    });

  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await this.service.get(ctx.org.org.orgId, input.id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      await this.service.delete(ctx.org.org.orgId, input.id);
      return { success: true };
    });

  @Route() deliveries = orgProcedure
    .input(z.object({
      webhookId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      status: z.enum(['pending', 'success', 'failed']).optional(),
    }))
    .query(async ({ ctx, input }) =>
      this.service.listDeliveries(ctx.org.org.orgId, input.webhookId, {
        limit: input.limit,
        status: input.status,
      }));

  @Route() redeliver = orgProcedure
    .input(z.object({ deliveryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await this.service.redeliver(ctx.org.org.orgId, input.deliveryId);
      return { success: true };
    });

  @Route() test = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const webhook = await this.service.get(ctx.org.org.orgId, input.id);
      if (!webhook) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }

      await this.service.dispatch(ctx.org.org.orgId, 'webhook.test', {
        message: 'This is a test webhook delivery',
        triggeredBy: ctx.org.user.id,
        webhookId: input.id,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    });
}
