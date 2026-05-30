import {
  orgProcedure,
  protectedProcedure,
  router,
} from '@cruzjs/core/trpc/context';
import { ORG_ACTIONS, RESOURCES } from '@cruzjs/core/orgs/audit-actions';
import { OrgService } from './org.service';
import { createOrgSchema, updateOrgSchema } from '@cruzjs/core/orgs/org.validation';
import { PermissionService } from './permission.service';
import { logAuditEvent } from '@cruzjs/core/shared/middleware/audit.middleware';
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const orgTrpc = router({
  /**
   * List user's organizations
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    const orgService = ctx.container.get<OrgService>(OrgService);
    const orgs = await orgService.listUserOrgs(ctx.session.user.id);
    return { organizations: orgs };
  }),

  /**
   * Create new organization
   */
  create: protectedProcedure
    .input(createOrgSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const orgService = ctx.container.get<OrgService>(OrgService);
      const org = await orgService.createOrg(
        {
          name: input.name,
          slug: input.slug,
          avatarUrl: input.avatarUrl || undefined,
          settings: input.settings,
        },
        ctx.session.user.id
      );

      // Log audit event
      await logAuditEvent(
        { orgId: org.id, userId: ctx.session.user.id },
        ORG_ACTIONS.CREATED,
        RESOURCES.ORGANIZATION,
        { name: org.name, slug: org.slug },
        ctx.request
      );

      return org;
    }),

  /**
   * Get organization by slug
   */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const orgService = ctx.container.get<OrgService>(OrgService);
      const org = await orgService.getOrgBySlug(input.slug);

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      // Check if user is a member
      const permissionService =
        ctx.container.get<PermissionService>(PermissionService);
      const role = await permissionService.getUserRole(
        ctx.session.user.id,
        org.id
      );
      if (!role) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this organization',
        });
      }

      // Get org with stats
      const orgWithStats = await orgService.getOrgWithStats(org.id);

      if (!orgWithStats) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      return orgWithStats;
    }),

  /**
   * Get organization by ID (requires org context via header or params)
   */
  get: orgProcedure.query(async ({ ctx }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context required',
      });
    }

    await requirePermission(ctx.org, 'org:read', ctx.container);

    const orgService = ctx.container.get<OrgService>(OrgService);
    const org = await orgService.getOrgWithStats(ctx.org.org.orgId);

    if (!org) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    return org;
  }),

  /**
   * Update organization (requires org context via header or params)
   */
  update: orgProcedure
    .input(updateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.org) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization context required',
        });
      }

      await requirePermission(ctx.org, 'org:write', ctx.container);

      const orgService = ctx.container.get<OrgService>(OrgService);
      const org = await orgService.updateOrg(ctx.org.org.orgId, {
        name: input.name,
        slug: input.slug,
        avatarUrl: input.avatarUrl || undefined,
        settings: input.settings,
      });

      // Log audit event
      await logAuditEvent(
        { orgId: ctx.org.org.orgId, userId: ctx.org.org.userId },
        ORG_ACTIONS.UPDATED,
        RESOURCES.ORGANIZATION,
        {
          name: org.name,
          slug: org.slug,
          updatedFields: Object.keys(input),
        },
        ctx.request
      );

      return org;
    }),

  /**
   * Delete organization (requires org context via header or params)
   */
  delete: orgProcedure.mutation(async ({ ctx }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context required',
      });
    }

    await requirePermission(ctx.org, 'org:delete', ctx.container);

    // Get org details before deletion for audit log
    const orgService = ctx.container.get<OrgService>(OrgService);
    const org = await orgService.getOrg(ctx.org.org.orgId);

    await orgService.deleteOrg(ctx.org.org.orgId);

    // Log audit event
    if (org) {
      await logAuditEvent(
        { orgId: ctx.org.org.orgId, userId: ctx.org.org.userId },
        ORG_ACTIONS.DELETED,
        RESOURCES.ORGANIZATION,
        { name: org.name, slug: org.slug },
        ctx.request
      );
    }

    return { success: true };
  }),
});
