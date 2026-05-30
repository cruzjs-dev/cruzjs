/**
 * Broadcast tRPC Router
 *
 * Endpoints for channel authorization and presence management.
 * Uses protectedProcedure since broadcasting is user-scoped.
 */

import { Inject } from '../di';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { protectedProcedure } from '../trpc/context';
import { TRPCError } from '@trpc/server';
import { BroadcastService } from './broadcast.service';
import { BroadcastAuthService } from './broadcast.middleware';
import {
  channelAuthSchema,
  presenceChannelSchema,
  joinPresenceSchema,
  leavePresenceSchema,
} from './broadcast.validation';

@Router()
export class BroadcastTrpc extends TrpcRouter {
  @Inject(BroadcastService) private service!: BroadcastService;
  @Inject(BroadcastAuthService) private authService!: BroadcastAuthService;

  /** Authorize access to a private or presence channel */
  @Route() authorize = protectedProcedure
    .input(channelAuthSchema)
    .mutation(async ({ ctx, input }) => {
      const allowed = await this.authService.authorize(
        input.channel,
        ctx.session.user.id,
        ctx.request,
      );
      if (!allowed) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Channel access denied' });
      }
      return { authorized: true, channel: input.channel };
    });

  /** Get presence members for a channel */
  @Route() presence = protectedProcedure
    .input(presenceChannelSchema)
    .query(async ({ input }) => {
      return this.service.getPresence(input.channel);
    });

  /** Join a presence channel */
  @Route() join = protectedProcedure
    .input(joinPresenceSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.joinPresence(input.channel, ctx.session.user.id, input.metadata);
      return { joined: true };
    });

  /** Leave a presence channel */
  @Route() leave = protectedProcedure
    .input(leavePresenceSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.leavePresence(input.channel, ctx.session.user.id);
      return { left: true };
    });
}
