/**
 * Feature Flag tRPC Router (OOP)
 *
 * Org-scoped endpoints for managing and evaluating feature flags.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { Inject } from '../di';
import { orgProcedure } from '../trpc/context';
import { FeatureFlagService } from './feature-flag.service';
import {
  createFlagSchema,
  updateFlagSchema,
  setSegmentsSchema,
  evaluateSchema,
} from './feature-flag.validation';

@Router()
export class FeatureFlagTrpc extends TrpcRouter {
  @Inject(FeatureFlagService) private service!: FeatureFlagService;

  /** Evaluate a single flag for the current user/org */
  @Route() evaluate = orgProcedure
    .input(evaluateSchema)
    .query(async ({ ctx, input }) =>
      this.service.evaluate(input.flagKey, {
        userId: ctx.org.user.id,
        orgId: ctx.org.org.orgId,
        attributes: input.attributes,
      }, ctx.org.org.orgId),
    );

  /** Evaluate all flags for the current user/org */
  @Route() evaluateAll = orgProcedure.query(async ({ ctx }) =>
    this.service.evaluateAll({
      userId: ctx.org.user.id,
      orgId: ctx.org.org.orgId,
    }, ctx.org.org.orgId),
  );

  /** List all flags for the org */
  @Route() list = orgProcedure.query(async ({ ctx }) =>
    this.service.list(ctx.org.org.orgId),
  );

  /** Create a new flag */
  @Route() create = orgProcedure
    .input(createFlagSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.create(ctx.org.org.orgId, ctx.org.user.id, input),
    );

  /** Update a flag */
  @Route() update = orgProcedure
    .input(updateFlagSchema)
    .mutation(async ({ ctx, input }) => {
      const flag = await this.service.update(ctx.org.org.orgId, input.id, input.data);
      if (!flag) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature flag not found' });
      }
      return flag;
    });

  /** Toggle a flag on/off */
  @Route() toggle = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const flag = await this.service.toggle(ctx.org.org.orgId, input.id);
      if (!flag) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature flag not found' });
      }
      return flag;
    });

  /** Set rollout percentage */
  @Route() setRollout = orgProcedure
    .input(z.object({
      id: z.string(),
      percentage: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const flag = await this.service.setRollout(ctx.org.org.orgId, input.id, input.percentage);
      if (!flag) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature flag not found' });
      }
      return flag;
    });

  /** Replace all segments for a flag */
  @Route() setSegments = orgProcedure
    .input(setSegmentsSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.setSegments(ctx.org.org.orgId, input.id, input.segments),
    );

  /** Delete a flag (soft delete) */
  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await this.service.delete(ctx.org.org.orgId, input.id);
      return { success: true };
    });
}
