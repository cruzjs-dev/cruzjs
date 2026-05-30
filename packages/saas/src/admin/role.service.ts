import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { injectable, inject } from 'inversify';
import { authIdentity } from '@cruzjs/core/database/schema';
import { orgMembers } from '@cruzjs/core/database/schema';
import type { OrgRole } from '@cruzjs/core/database/schema';
import { userProfile } from '@cruzjs/start/database/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from '@cruzjs/core/shared/middleware/audit.middleware';
import { MEMBER_ACTIONS, RESOURCES } from '@cruzjs/core/orgs/audit-actions';

/**
 * Admin role management service
 * Allows admins to override permissions and change roles
 */
@injectable()
export class AdminRoleService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}
  /**
   * Change member role (admin override)
   * @param orgId - Organization ID
   * @param userId - User ID
   * @param newRole - New role
   * @param adminUserId - Admin user ID (for audit log)
   */
  async changeMemberRole(
    orgId: string,
    userId: string,
    newRole: OrgRole,
    adminUserId: string
  ) {
    // Update member role
    const [member] = await this.db
      .update(orgMembers)
      .set({ role: newRole })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .returning();

    if (!member) {
      throw new Error('Member not found');
    }

    // Get user and org details for audit log
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);
    const [profile] = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    const user = identity ? { email: identity.email, name: profile?.fullName ?? null } : null;

    // Log admin action
    await logAuditEvent(
      { orgId, userId: adminUserId },
      MEMBER_ACTIONS.ROLE_CHANGED,
      RESOURCES.MEMBER,
      {
        targetUserId: userId,
        targetUserName: user?.name || user?.email || 'Unknown',
        oldRole: 'UNKNOWN', // We don't track old role, but could add it
        newRole,
        adminOverride: true,
      },
      undefined
    );

    return { ...member, user, organization: { name: '' } };
  }

  /**
   * Add member to organization (admin override)
   */
  async addMember(
    orgId: string,
    userId: string,
    role: OrgRole,
    adminUserId: string
  ) {
    // Check if member already exists
    const [existing] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    // Add member
    const now = new Date().toISOString();
    const [member] = await this.db
      .insert(orgMembers)
      .values({
        orgId,
        userId,
        role,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Get user details for audit log
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);
    const [profile] = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    const user = identity ? { email: identity.email, name: profile?.fullName ?? null } : null;

    // Log admin action
    await logAuditEvent(
      { orgId, userId: adminUserId },
      MEMBER_ACTIONS.ADDED,
      RESOURCES.MEMBER,
      {
        targetUserId: userId,
        targetUserName: user?.name || user?.email || 'Unknown',
        role,
        adminOverride: true,
      },
      undefined
    );

    return { ...member, user, organization: { name: '' } };
  }

  /**
   * Remove member from organization (admin override)
   */
  async removeMember(
    orgId: string,
    userId: string,
    adminUserId: string
  ) {
    const [member] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (!member) {
      throw new Error('Member not found');
    }

    // Get user details for audit log before deletion
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);
    const [profile] = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    const user = identity ? { email: identity.email, name: profile?.fullName ?? null } : null;

    // Remove member
    await this.db
      .delete(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

    // Log admin action
    await logAuditEvent(
      { orgId, userId: adminUserId },
      MEMBER_ACTIONS.REMOVED,
      RESOURCES.MEMBER,
      {
        targetUserId: userId,
        targetUserName: user?.name || user?.email || 'Unknown',
        removedRole: member.role,
        adminOverride: true,
      },
      undefined
    );
  }
}
