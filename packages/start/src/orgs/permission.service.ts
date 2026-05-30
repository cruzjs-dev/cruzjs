import { injectable, inject } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and } from 'drizzle-orm';
import { orgMembers } from '@cruzjs/core/database/schema';
import type { OrgRole } from '@cruzjs/core/database/schema';
import type { Permission } from '@cruzjs/core/orgs/org.models';
import { rolePermissions, ALL_PERMISSIONS } from '@cruzjs/core/orgs/org.models';

/**
 * Permission service for checking user permissions in organizations
 */
@injectable()
export class PermissionService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Get user's role in an organization
   */
  async getUserRole(userId: string, orgId: string): Promise<OrgRole | null> {
    const [membership] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    return (membership?.role as OrgRole) || null;
  }

  /**
   * Check if user has a specific permission in an organization
   */
  async hasPermission(
    userId: string,
    orgId: string,
    permission: Permission
  ): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);

    if (!role) {
      return false;
    }

    const permissions = rolePermissions[role];

    // OWNER has all permissions
    if (permissions === ALL_PERMISSIONS) {
      return true;
    }

    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    orgId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, orgId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    orgId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, orgId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check permission and throw error if user doesn't have it
   */
  async checkPermission(
    userId: string,
    orgId: string,
    permission: Permission
  ): Promise<void> {
    const hasAccess = await this.hasPermission(userId, orgId, permission);

    if (!hasAccess) {
      throw new Error(`User does not have permission: ${permission}`);
    }
  }

  /**
   * Check if user is organization owner
   */
  async isOrgOwner(userId: string, orgId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);
    return role === 'OWNER';
  }

  /**
   * Check if user is organization admin or owner
   */
  async isOrgAdminOrOwner(userId: string, orgId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);
    return role === 'OWNER' || role === 'ADMIN';
  }
}
