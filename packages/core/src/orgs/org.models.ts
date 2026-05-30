/**
 * Organization and permission models
 */

import type { OrgRole } from '../database/schema';

/**
 * Permission types for organization access control
 */
export type Permission =
  | 'org:read'
  | 'org:write'
  | 'org:delete'
  | 'member:read'
  | 'member:write'
  | 'member:delete'
  | 'billing:read'
  | 'billing:write'
  | 'pipeline:read'
  | 'pipeline:write'
  | 'pipeline:delete';

/**
 * Special permission that grants all permissions
 */
export const ALL_PERMISSIONS = '*' as const;

/**
 * Role-based permission mapping
 * OWNER has all permissions (*)
 * Other roles have specific permission sets
 */
export const rolePermissions: Record<OrgRole, Permission[] | typeof ALL_PERMISSIONS> = {
  OWNER: ALL_PERMISSIONS, // All permissions
  ADMIN: [
    'org:read',
    'org:write',
    'member:read',
    'member:write',
    'member:delete',
    'billing:read',
    'billing:write',
    'pipeline:read',
    'pipeline:write',
    'pipeline:delete',
  ],
  MEMBER: ['org:read', 'member:read', 'pipeline:read', 'pipeline:write'],
  VIEWER: ['org:read', 'pipeline:read'],
};

/**
 * Organization context with user's role
 */
export type OrgContext = {
  orgId: string;
  userId: string;
  role: OrgRole;
};

/**
 * Request context with organization information
 */
export type AuthenticatedOrgRequest = {
  user: {
    id: string;
  };
  org: OrgContext;
};

/**
 * Create organization input
 */
export type CreateOrgInput = {
  name: string;
  slug?: string; // Optional, will be generated from name if not provided
  avatarUrl?: string;
  settings?: Record<string, unknown>;
};

/**
 * Update organization input
 */
export type UpdateOrgInput = {
  name?: string;
  slug?: string;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
};

/**
 * Organization response
 */
export type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Organization with member count
 */
export type OrganizationWithStats = OrganizationResponse & {
  memberCount: number;
};

/**
 * User information included in member responses
 */
export type MemberUserInfo = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

/**
 * Member response with user details
 */
export type MemberResponse = {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
  user: MemberUserInfo;
};

/**
 * Add member input (for internal use - members typically added via invitations)
 */
export type AddMemberInput = {
  userId: string;
  role: OrgRole;
};

/**
 * Update member role input
 */
export type UpdateMemberRoleInput = {
  role: OrgRole;
};

/**
 * Create invitation input
 */
export type CreateInvitationInput = {
  email: string;
  role: OrgRole;
};

/**
 * Invitation response
 */
export type InvitationResponse = {
  id: string;
  email: string;
  orgId: string;
  role: OrgRole;
  expiresAt: Date;
  createdAt: Date;
};

/**
 * Invitation response with organization details (for accept/decline pages)
 */
export type InvitationWithOrgResponse = InvitationResponse & {
  organization: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
  };
};

/**
 * Audit action types
 */
export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'added'
  | 'removed'
  | 'role_changed'
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'canceled'
  | 'subscribed'
  | 'unsubscribed'
  | 'payment_succeeded'
  | 'payment_failed';

/**
 * Audit resource types
 */
export type AuditResource =
  | 'organization'
  | 'member'
  | 'invitation'
  | 'subscription'
  | 'billing'
  | 'user';

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
    email: string | null; // Can be null from leftJoin even though identity.email is required
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

