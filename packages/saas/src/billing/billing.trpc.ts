/**
 * Billing tRPC Router
 *
 * OOP router (org-scoped) for billing operations.
 * Uses @Router/@Route pattern with property injection.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Router, Route, TrpcRouter } from '@cruzjs/core/trpc/router-class';
import { Inject } from '@cruzjs/core/di';
import { publicProcedure, orgProcedure } from '@cruzjs/core/trpc/context';
import { BillingService } from './billing.service';
import {
  createCheckoutSchema,
  createPortalSchema,
  cancelSubscriptionSchema,
  updateSeatsSchema,
  checkFeatureSchema,
  getUsageSchema,
} from './billing.validation';

@Router()
export class BillingTrpc extends TrpcRouter {
  @Inject(BillingService) private service!: BillingService;

  @Route() getPlans = publicProcedure.query(async () =>
    this.service.listPlans());

  @Route() getSubscription = orgProcedure.query(async ({ ctx }) =>
    this.service.getSubscription(ctx.org.org.orgId));

  @Route() createCheckout = orgProcedure
    .input(createCheckoutSchema)
    .mutation(async ({ ctx, input }) => {
      return this.service.createCheckoutSession(ctx.org.org.orgId, input.planId, {
        quantity: input.quantity,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
    });

  @Route() createPortal = orgProcedure
    .input(createPortalSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.createPortalSession(ctx.org.org.orgId, input.returnUrl));

  @Route() cancelSubscription = orgProcedure
    .input(cancelSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.cancelSubscription(ctx.org.org.orgId, input.atPeriodEnd);
      return { success: true };
    });

  @Route() updateSeats = orgProcedure
    .input(updateSeatsSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.updateSeats(ctx.org.org.orgId, input.seats);
      return { success: true };
    });

  @Route() getInvoices = orgProcedure.query(async ({ ctx }) =>
    this.service.getInvoices(ctx.org.org.orgId));

  @Route() getUsage = orgProcedure
    .input(getUsageSchema)
    .query(async ({ ctx, input }) =>
      this.service.getUsage(
        ctx.org.org.orgId,
        input.metric,
        new Date(input.from),
        new Date(input.to),
      ));

  @Route() checkFeature = orgProcedure
    .input(checkFeatureSchema)
    .query(async ({ ctx, input }) =>
      this.service.hasFeature(ctx.org.org.orgId, input.feature));

  @Route() getLimits = orgProcedure.query(async ({ ctx }) =>
    this.service.getLimits(ctx.org.org.orgId));
}
