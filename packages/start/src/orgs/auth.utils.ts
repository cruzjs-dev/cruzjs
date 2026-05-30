import type { OrgRole } from '@cruzjs/core/database/schema';
import { buildContainerWithProviders } from '@cruzjs/core/framework/application.server';
import { MemberService } from './member.service';
import type { OrganizationResponse } from '@cruzjs/core/orgs/org.models';
import { OrgService } from './org.service';
import { PermissionService } from './permission.service';

/**
 * Authorization utility functions
 */

/**
 * Get all organizations a user is a member of (excluding soft-deleted)
 */
export async function getUserOrganizations(userId: string) {
  const container = await buildContainerWithProviders([]);
  const orgService = container.get<OrgService>(OrgService);
  const orgs = await orgService.listUserOrgs(userId);

  const memberService = container.get<MemberService>(MemberService);
  const memberships = await Promise.all(
    orgs.map(async (org: OrganizationResponse) => {
      const member = await memberService.getMember(org.id, userId);
      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          avatarUrl: org.avatarUrl,
        },
        role: member?.role || null,
        joinedAt: member?.createdAt || null,
      };
    })
  );

  return memberships.filter((m) => m.role !== null && m.joinedAt !== null);
}

/**
 * Get user's role in organization (with organization details)
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<{
  role: OrgRole;
  organization: { id: string; name: string; slug: string };
} | null> {
  const container = await buildContainerWithProviders([]);
  const orgService = container.get<OrgService>(OrgService);
  const org = await orgService.getOrg(orgId);

  if (!org) {
    return null;
  }

  const memberService = container.get<MemberService>(MemberService);
  const member = await memberService.getMember(orgId, userId);

  if (!member) {
    return null;
  }

  return {
    role: member.role,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
    },
  };
}

/**
 * Check if user is owner of organization
 */
export async function isOrgOwner(
  userId: string,
  orgId: string
): Promise<boolean> {
  const container = await buildContainerWithProviders([]);
  const permissionService = container.get<PermissionService>(PermissionService);
  return permissionService.isOrgOwner(userId, orgId);
}

/**
 * Check if user is admin or owner of organization
 */
export async function isOrgAdminOrOwner(
  userId: string,
  orgId: string
): Promise<boolean> {
  const container = await buildContainerWithProviders([]);
  const permissionService = container.get<PermissionService>(PermissionService);
  return permissionService.isOrgAdminOrOwner(userId, orgId);
}

/**
 * Get user role in organization
 */
export async function getUserRole(userId: string, orgId: string) {
  const container = await buildContainerWithProviders([]);
  const permissionService = container.get<PermissionService>(PermissionService);
  return permissionService.getUserRole(userId, orgId);
}
