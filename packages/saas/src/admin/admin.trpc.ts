/**
 * Admin tRPC Router (OOP)
 *
 * Admin-only endpoints for resource management, dashboard stats, and
 * user impersonation. All procedures verify the caller has admin role.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Router, Route, TrpcRouter } from '@cruzjs/core/trpc/router-class';
import { Inject } from '@cruzjs/core/di';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { AdminService } from './admin.service';
import { AdminRegistry } from './admin.registry';
import { ImpersonationService } from './admin.impersonation';
import { AdminDashboardService } from './dashboard.service';
import { AdminUserService } from './user.service';
import { AdminOrgService } from './org.service';
import {
  adminListInputSchema,
  adminGetInputSchema,
  adminCreateInputSchema,
  adminUpdateInputSchema,
  adminDeleteInputSchema,
  adminExecuteActionInputSchema,
  adminImpersonateInputSchema,
} from './admin.validation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an admin-only procedure that verifies the caller is an admin.
 * Uses protectedProcedure (user-scoped) and checks isAdmin on the profile.
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // The user's admin status should be available on the session.
  // Check via the userProfile isAdmin flag loaded at auth time.
  const user = ctx.session?.user as
    | (typeof ctx.session.user & { isAdmin?: boolean })
    | undefined;

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({ ctx });
});

// ─── Router ──────────────────────────────────────────────────────────────────

@Router()
export class AdminTrpc extends TrpcRouter {
  @Inject(AdminService) private service!: AdminService;
  @Inject(AdminRegistry) private registry!: AdminRegistry;
  @Inject(ImpersonationService) private impersonation!: ImpersonationService;
  @Inject(AdminDashboardService) private dashboardService!: AdminDashboardService;
  @Inject(AdminUserService) private userService!: AdminUserService;
  @Inject(AdminOrgService) private orgService!: AdminOrgService;

  // ─── Resource Management ───────────────────────────────────────────────

  /** List all registered admin resources and their config. */
  @Route() listResources = adminProcedure.query(async () => {
    const configs = this.registry.list();
    // Strip handler functions before sending to client
    return configs.map((c) => ({
      name: c.name,
      columns: c.columns,
      operations: c.operations,
      defaultSort: c.defaultSort,
      perPage: c.perPage,
      filters: c.filters,
      permission: c.permission,
    }));
  });

  /** List records for a resource with pagination + filtering + sorting. */
  @Route() list = adminProcedure
    .input(adminListInputSchema)
    .query(async ({ input }) =>
      this.service.list(input.resource, {
        page: input.page,
        perPage: input.perPage,
        search: input.search,
        filters: input.filters,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
      }),
    );

  /** Get a single record by resource name and ID. */
  @Route() get = adminProcedure
    .input(adminGetInputSchema)
    .query(async ({ input }) => this.service.get(input.resource, input.id));

  /** Create a record in the given resource. */
  @Route() create = adminProcedure
    .input(adminCreateInputSchema)
    .mutation(async ({ input }) =>
      this.service.create(input.resource, input.data),
    );

  /** Update a record by resource name and ID. */
  @Route() update = adminProcedure
    .input(adminUpdateInputSchema)
    .mutation(async ({ input }) =>
      this.service.update(input.resource, input.id, input.data),
    );

  /** Delete one or more records by resource name and IDs. */
  @Route() delete = adminProcedure
    .input(adminDeleteInputSchema)
    .mutation(async ({ input }) => {
      await this.service.delete(input.resource, input.ids);
      return { success: true };
    });

  /** Execute a registered action on one or more records. */
  @Route() executeAction = adminProcedure
    .input(adminExecuteActionInputSchema)
    .mutation(async ({ input }) => {
      await this.service.executeAction(input.resource, input.action, input.ids);
      return { success: true };
    });

  // ─── Dashboard ─────────────────────────────────────────────────────────

  /** Get stats for all registered resources (counts + trends). */
  @Route() getStats = adminProcedure.query(async () =>
    this.service.getStats(),
  );

  /** Get detailed dashboard metrics (users, subscriptions, revenue, jobs). */
  @Route() dashboard = adminProcedure.query(async () => {
    const metrics = await this.dashboardService.getMetrics();
    return {
      users: { total: metrics.users.total },
      organizations: { total: metrics.organizations.total },
    };
  });

  // ─── Legacy User / Org endpoints (backwards compat) ────────────────────

  /** List all users (admin only). */
  @Route() users = adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const result = await this.userService.listUsers(
        {},
        { page: input.page, pageSize: input.limit },
      );
      return {
        users: result.users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified ? new Date() : null,
          createdAt: user.createdAt,
        })),
        pagination: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    });

  /** Get user by ID (admin only). */
  @Route() getUser = adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await this.userService.getUser(input.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified ? new Date() : null,
          createdAt: user.createdAt,
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        throw error;
      }
    });

  /** List all organizations (admin only). */
  @Route() orgs = adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const result = await this.orgService.listOrgs(
        {},
        { page: input.page, pageSize: input.limit },
      );
      return {
        organizations: result.orgs.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
        })),
        pagination: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    });

  /** Get organization by ID (admin only). */
  @Route() getOrg = adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const org = await this.orgService.getOrg(input.id);
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Organization not found'
        ) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organization not found',
          });
        }
        throw error;
      }
    });

  // ─── Impersonation ─────────────────────────────────────────────────────

  /** Generate a short-lived impersonation token for a target user. */
  @Route() impersonate = adminProcedure
    .input(adminImpersonateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await this.service.impersonate(
        input.targetUserId,
        ctx.session.user.id,
      );
      return { token: result.token };
    });

  /** Stop impersonating (placeholder -- client clears session). */
  @Route() stopImpersonating = adminProcedure.mutation(async () => {
    // Impersonation sessions are managed client-side by clearing the
    // impersonation cookie/token. This endpoint is a no-op signal.
    return { success: true };
  });
}

// Re-export the old functional router for backwards compatibility with
// packages/saas/src/trpc/routers.ts which imports `adminTrpc` as a router instance.
// The module system will use the OOP class; this export keeps the type shape.
export { AdminTrpc as adminTrpc };
