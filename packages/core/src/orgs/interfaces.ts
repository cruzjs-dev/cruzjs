/**
 * DI tokens and interfaces for org services.
 *
 * Core middleware depends on these interfaces; implementations live in @cruzjs/start.
 */

import type { OrgRole } from '../database/schema';
import type {
  CreateInvitationInput,
  CreateOrgInput,
  InvitationResponse,
  InvitationWithOrgResponse,
  MemberResponse,
  OrganizationResponse,
  OrganizationWithStats,
  Permission,
  UpdateOrgInput,
} from './org.models';

// ---------------------------------------------------------------------------
// DI Tokens
// ---------------------------------------------------------------------------

export const ORG_SERVICE = Symbol.for('IOrgService');
export const MEMBER_SERVICE = Symbol.for('IMemberService');
export const PERMISSION_SERVICE = Symbol.for('IPermissionService');
export const INVITATION_SERVICE = Symbol.for('IInvitationService');

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IOrgService {
  getOrg(orgId: string): Promise<OrganizationResponse | null>;
  getOrgBySlug(slug: string): Promise<OrganizationResponse | null>;
  getOrgWithStats(orgId: string): Promise<OrganizationWithStats | null>;
  listUserOrgs(userId: string): Promise<OrganizationResponse[]>;
  createOrg(data: CreateOrgInput, ownerId: string): Promise<OrganizationResponse>;
  updateOrg(orgId: string, data: UpdateOrgInput): Promise<OrganizationResponse>;
  deleteOrg(orgId: string): Promise<void>;
}

export interface IPermissionService {
  getUserRole(userId: string, orgId: string): Promise<OrgRole | null>;
  hasPermission(userId: string, orgId: string, permission: Permission): Promise<boolean>;
  hasAnyPermission(userId: string, orgId: string, permissions: Permission[]): Promise<boolean>;
  hasAllPermissions(userId: string, orgId: string, permissions: Permission[]): Promise<boolean>;
  checkPermission(userId: string, orgId: string, permission: Permission): Promise<void>;
  isOrgOwner(userId: string, orgId: string): Promise<boolean>;
  isOrgAdminOrOwner(userId: string, orgId: string): Promise<boolean>;
}

export interface IMemberService {
  getMember(orgId: string, userId: string): Promise<MemberResponse | null>;
  listMembers(orgId: string): Promise<MemberResponse[]>;
  addMember(orgId: string, userId: string, role?: OrgRole): Promise<MemberResponse>;
  removeMember(orgId: string, userId: string): Promise<void>;
  updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<MemberResponse>;
  leaveBand(orgId: string, userId: string): Promise<void>;
}

export interface IInvitationService {
  createInvitation(
    orgId: string,
    input: CreateInvitationInput,
    invitedBy: string,
  ): Promise<{ invitation: InvitationResponse; token: string }>;
  acceptInvitation(token: string, userId?: string): Promise<void>;
  declineInvitation(token: string): Promise<void>;
  updateInvitation(
    orgId: string,
    invitationId: string,
    updates: { role?: OrgRole; expiresAt?: Date },
  ): Promise<InvitationResponse>;
  cancelInvitation(orgId: string, invitationId: string): Promise<void>;
  listInvitations(orgId: string): Promise<InvitationResponse[]>;
  getInvitationByToken(token: string): Promise<InvitationWithOrgResponse | null>;
  cleanupExpiredInvitations(): Promise<number>;
}
