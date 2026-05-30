/**
 * @cruzjs/saas Admin Dashboard
 *
 * Generic admin resource management with registration, CRUD, impersonation,
 * and dashboard stats.
 */

// Types
export type {
  AdminResourceConfig,
  AdminColumnConfig,
  AdminFilterConfig,
  AdminRowAction,
  AdminBulkAction,
  AdminListResult,
  AdminStats,
} from './admin.types';

// Registry
export { AdminRegistry } from './admin.registry';

// Service
export { AdminService } from './admin.service';

// Impersonation
export {
  ImpersonationService,
  impersonationTokens,
} from './admin.impersonation';
export type {
  ImpersonationToken,
  NewImpersonationToken,
} from './admin.impersonation';

// tRPC Router
export { AdminTrpc } from './admin.trpc';

// Validation
export {
  adminListInputSchema,
  adminGetInputSchema,
  adminCreateInputSchema,
  adminUpdateInputSchema,
  adminDeleteInputSchema,
  adminExecuteActionInputSchema,
  adminImpersonateInputSchema,
} from './admin.validation';
export type {
  AdminListInput,
  AdminGetInput,
  AdminCreateInput,
  AdminUpdateInput,
  AdminDeleteInput,
  AdminExecuteActionInput,
  AdminImpersonateInput,
} from './admin.validation';

// Legacy services (backwards compat)
export { AdminDashboardService } from './dashboard.service';
export { AdminUserService } from './user.service';
export { AdminOrgService } from './org.service';
export { AdminRoleService } from './role.service';

// Module
export { AdminModule } from './admin.module';
