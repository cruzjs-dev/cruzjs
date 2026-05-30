/**
 * Organization and permission models
 *
 * Canonical types are in @cruzjs/core/orgs/org.models.
 * Re-exported here for backwards compatibility.
 */

// Re-export everything from core
export {
  ALL_PERMISSIONS,
  rolePermissions,
} from '@cruzjs/core/orgs/org.models';

export type {
  Permission,
  OrgContext,
  AuthenticatedOrgRequest,
  CreateOrgInput,
  UpdateOrgInput,
  OrganizationResponse,
  OrganizationWithStats,
  MemberUserInfo,
  MemberResponse,
  AddMemberInput,
  UpdateMemberRoleInput,
  CreateInvitationInput,
  InvitationResponse,
  InvitationWithOrgResponse,
  AuditAction,
  AuditResource,
} from '@cruzjs/core/orgs/org.models';

// Pro-specific audit types (used by audit-log.service)
import type { AuditAction, AuditResource } from '@cruzjs/core/orgs/org.models';

/**
 * Audit log entry with user information
 */
export type AuditLogEntry = {
  id: string;
  orgId: string;
  userId: string | null;
  action: AuditAction;
  resource: AuditResource;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
};

/**
 * Audit log filters for querying logs
 */
export type AuditLogFilters = {
  action?: AuditAction;
  resource?: AuditResource;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  limit?: number;
};
