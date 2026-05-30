/**
 * Admin Module
 *
 * Registers all admin services (generic CRUD, registry, impersonation,
 * dashboard, user/org management) and the OOP tRPC router.
 */

import { Module } from '@cruzjs/core/di';
import { AdminService } from './admin.service';
import { AdminRegistry } from './admin.registry';
import { ImpersonationService } from './admin.impersonation';
import { AdminDashboardService } from './dashboard.service';
import { AdminOrgService } from './org.service';
import { AdminRoleService } from './role.service';
import { AdminUserService } from './user.service';
import { AdminTrpc } from './admin.trpc';

@Module({
  providers: [
    AdminService,
    AdminRegistry,
    ImpersonationService,
    AdminDashboardService,
    AdminOrgService,
    AdminRoleService,
    AdminUserService,
    AdminTrpc,
  ],
  trpcRouters: {
    admin: AdminTrpc,
  },
})
export class AdminModule {}
