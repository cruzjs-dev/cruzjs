import {
  orgProcedure,
  publicProcedure,
  router,
} from '@cruzjs/core/trpc/context';
import { InvitationService } from './invitation.service';
import {
  createInvitationSchema,
  updateInvitationSchema,
} from '@cruzjs/core/orgs/invitation.validation';
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const invitationTrpc = router({
  /**
   * List invitations for an organization
   */
  list: orgProcedure.query(async ({ ctx }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context required',
      });
    }

    await requirePermission(ctx.org, 'member:read', ctx.container);

    const invitationService =
      ctx.container.get<InvitationService>(InvitationService);
    const invitations = await invitationService.listInvitations(
      ctx.org.org.orgId
    );
    return { invitations };
  }),

  /**
   * Get invitation by token
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitationService =
        ctx.container.get<InvitationService>(InvitationService);
      const invitation = await invitationService.getInvitationByToken(
        input.token
      );

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      return invitation;
    }),

  /**
   * Create invitation
   */
  create: orgProcedure
    .input(createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'member:write', ctx.container);

      if (!ctx.session?.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const invitationService =
        ctx.container.get<InvitationService>(InvitationService);
      const invitation = await invitationService.createInvitation(
        ctx.org.org.orgId,
        { email: input.email, role: input.role },
        ctx.session.user.id
      );

      return invitation;
    }),

  /**
   * Update invitation
   */
  update: orgProcedure
    .input(
      z
        .object({
          invitationId: z.string(),
        })
        .merge(updateInvitationSchema)
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'member:write', ctx.container);

      const invitationService =
        ctx.container.get<InvitationService>(InvitationService);
      const { invitationId, ...updateData } = input;
      const invitation = await invitationService.updateInvitation(
        ctx.org.org.orgId,
        invitationId,
        updateData
      );

      return invitation;
    }),

  /**
   * Cancel invitation
   */
  cancel: orgProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'member:write', ctx.container);

      const invitationService =
        ctx.container.get<InvitationService>(InvitationService);
      await invitationService.cancelInvitation(
        ctx.org.org.orgId,
        input.invitationId
      );

      return { success: true };
    }),

  /**
   * Accept invitation
   */
  accept: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitationService =
        ctx.container.get<InvitationService>(InvitationService);
      const result = await invitationService.acceptInvitation(input.token);
      return result;
    }),

  /**
   * Decline invitation
   */
  decline: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitationService =
        ctx.container.get<InvitationService>(InvitationService);
      await invitationService.declineInvitation(input.token);
      return { success: true };
    }),
});
