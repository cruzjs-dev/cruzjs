import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { MEMBER_ACTIONS, RESOURCES } from '@cruzjs/core/orgs/audit-actions';
import { MemberService } from './member.service';
import {
  addMemberSchema,
  updateMemberRoleSchema,
} from '@cruzjs/core/orgs/member.validation';
import { logAuditEvent } from '@cruzjs/core/shared/middleware/audit.middleware';
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const memberTrpc = router({
  /**
   * List all members of an organization
   */
  list: orgProcedure.query(async ({ ctx }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context required',
      });
    }

    await requirePermission(ctx.org, 'member:read', ctx.container);

    const memberService = ctx.container.get<MemberService>(MemberService);
    const members = await memberService.listMembers(ctx.org.org.orgId);
    return { members };
  }),

  /**
   * Get a specific member
   */
  get: orgProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'member:read', ctx.container);

      const memberService = ctx.container.get<MemberService>(MemberService);
      const member = await memberService.getMember(
        ctx.org.org.orgId,
        input.userId
      );

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      return member;
    }),

  /**
   * Add a member to an organization
   */
  add: orgProcedure.input(addMemberSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context required',
      });
    }

    await requirePermission(ctx.org, 'member:write', ctx.container);

    const memberService = ctx.container.get<MemberService>(MemberService);
    const member = await memberService.addMember(
      ctx.org.org.orgId,
      input.userId,
      input.role
    );

    // Log audit event
    await logAuditEvent(
      { orgId: ctx.org.org.orgId, userId: ctx.org.org.userId },
      MEMBER_ACTIONS.ADDED,
      RESOURCES.MEMBER,
      {
        userId: input.userId,
        role: input.role,
        memberName: member.user.name,
        memberEmail: member.user.email,
      },
      ctx.request
    );

    return member;
  }),

  /**
   * Update member role
   */
  updateRole: orgProcedure
    .input(
      z
        .object({
          userId: z.string(),
        })
        .merge(updateMemberRoleSchema)
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'member:write', ctx.container);

      const memberService = ctx.container.get<MemberService>(MemberService);
      const member = await memberService.updateMemberRole(
        ctx.org.org.orgId,
        input.userId,
        input.role
      );

      // Log audit event
      await logAuditEvent(
        { orgId: ctx.org.org.orgId, userId: ctx.org.org.userId },
        MEMBER_ACTIONS.ROLE_CHANGED,
        RESOURCES.MEMBER,
        {
          userId: input.userId,
          role: input.role,
        },
        ctx.request
      );

      return member;
    }),

  /**
   * Remove a member from an organization
   */
  remove: orgProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'member:write', ctx.container);

      const memberService = ctx.container.get<MemberService>(MemberService);
      await memberService.removeMember(ctx.org.org.orgId, input.userId);

      // Log audit event
      await logAuditEvent(
        { orgId: ctx.org.org.orgId, userId: ctx.org.org.userId },
        MEMBER_ACTIONS.REMOVED,
        RESOURCES.MEMBER,
        {
          userId: input.userId,
        },
        ctx.request
      );

      return { success: true };
    }),

  /**
   * Leave a band (self-service)
   * Member can leave any band except:
   * - If they are the owner
   * - If it's their last band
   */
  leave: orgProcedure.mutation(async ({ ctx }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Band context required',
      });
    }

    const memberService = ctx.container.get<MemberService>(MemberService);

    try {
      await memberService.leaveBand(ctx.org.org.orgId, ctx.session.user.id);
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Failed to leave band',
      });
    }

    // Log audit event
    await logAuditEvent(
      { orgId: ctx.org.org.orgId, userId: ctx.session.user.id },
      MEMBER_ACTIONS.REMOVED,
      RESOURCES.MEMBER,
      { userId: ctx.session.user.id, action: 'self-leave' },
      ctx.request
    );

    return { success: true };
  }),
});
