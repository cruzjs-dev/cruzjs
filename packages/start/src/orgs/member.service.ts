import { authIdentity } from '@cruzjs/core/database/schema';
import type { OrgRole } from '@cruzjs/core/database/schema';
import { orgMembers } from '@cruzjs/core/database/schema';
import { userProfile } from '../database/schema';
import { and, asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import type { MemberResponse } from '@cruzjs/core/orgs/org.models';

/**
 * Member service for organization member management
 */
@injectable()
export class MemberService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Add a member to an organization
   * Note: In practice, members are added via invitations (Task 13)
   * This function is for internal use or direct member addition
   */
  async addMember(
    orgId: string,
    userId: string,
    role: OrgRole = 'MEMBER'
  ): Promise<MemberResponse> {
    // Check if member already exists
    const [existing] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    // Create membership
    const now = new Date().toISOString();
    const [membership] = await this.db
      .insert(orgMembers)
      .values({
        orgId,
        userId,
        role,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Get user details (identity + profile)
    const identityResults = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);
    const identity = identityResults[0];

    const profileResults = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    const profile = profileResults[0];

    return {
      id: membership.id,
      orgId: membership.orgId,
      userId: membership.userId,
      role: membership.role as OrgRole,
      createdAt: new Date(membership.createdAt),
      updatedAt: new Date(membership.updatedAt),
      user: {
        id: identity?.id ?? userId,
        name: profile?.fullName ?? null,
        email: identity?.email ?? '',
        avatarUrl: profile?.avatarUrl ?? null,
      },
    };
  }

  /**
   * Remove a member from an organization
   * Prevents removing the last owner
   */
  async removeMember(orgId: string, userId: string): Promise<void> {
    // Get the membership to check role
    const [membership] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new Error('User is not a member of this organization');
    }

    // Prevent removing last owner
    if (membership.role === 'OWNER') {
      const ownerMembers = await this.db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'OWNER')));
      const ownerCount = ownerMembers.length;

      if (ownerCount <= 1) {
        throw new Error(
          'Cannot remove the last owner. Transfer ownership first.'
        );
      }
    }

    await this.db
      .delete(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  }

  /**
   * Update a member's role
   * Only OWNER can change OWNER role
   */
  async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgRole
  ): Promise<MemberResponse> {
    // Get existing membership
    const [existing] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new Error('User is not a member of this organization');
    }

    // Prevent removing last owner if changing role away from OWNER
    if (existing.role === 'OWNER' && role !== 'OWNER') {
      const ownerMembers = await this.db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'OWNER')));
      const ownerCount = ownerMembers.length;

      if (ownerCount <= 1) {
        throw new Error(
          'Cannot change role of the last owner. Transfer ownership first.'
        );
      }
    }

    // Update role
    const [membership] = await this.db
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .returning();

    // Get user details (identity + profile)
    const identityResults = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);
    const identity = identityResults[0];

    const profileResults = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    const profile = profileResults[0];

    return {
      id: membership.id,
      orgId: membership.orgId,
      userId: membership.userId,
      role: membership.role as OrgRole,
      createdAt: new Date(membership.createdAt),
      updatedAt: new Date(membership.updatedAt),
      user: {
        id: identity?.id ?? userId,
        name: profile?.fullName ?? null,
        email: identity?.email ?? '',
        avatarUrl: profile?.avatarUrl ?? null,
      },
    };
  }

  /**
   * List all members of an organization
   */
  async listMembers(orgId: string): Promise<MemberResponse[]> {
    // Fetch memberships
    const memberships = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId))
      .orderBy(asc(orgMembers.role), asc(orgMembers.createdAt));

    // Get user IDs
    const userIds = memberships.map((m) => m.userId);
    if (userIds.length === 0) {
      return [];
    }

    // Fetch identities and profiles for all users
    const identities = await this.db
      .select()
      .from(authIdentity);
    const profiles = await this.db
      .select()
      .from(userProfile);

    // Create lookup maps
    const identityMap = new Map(identities.map((i) => [i.id, i]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return memberships.map((membership) => {
      const identity = identityMap.get(membership.userId);
      const profile = profileMap.get(membership.userId);
      return {
        id: membership.id,
        orgId: membership.orgId,
        userId: membership.userId,
        role: membership.role as OrgRole,
        createdAt: new Date(membership.createdAt),
        updatedAt: new Date(membership.updatedAt),
        user: {
          id: membership.userId,
          name: profile?.fullName ?? null,
          email: identity?.email ?? '',
          avatarUrl: profile?.avatarUrl ?? null,
        },
      };
    });
  }

  /**
   * Allow a member to leave a band (self-service)
   * Prevents: owner leaving, leaving last band
   */
  async leaveBand(orgId: string, userId: string): Promise<void> {
    // Get the membership to check role
    const [membership] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new Error('You are not a member of this band');
    }

    // Owners cannot leave - must transfer ownership first
    if (membership.role === 'OWNER') {
      throw new Error('Band owner cannot leave. Transfer ownership first.');
    }

    // Check if this is the user's last band
    const userMemberships = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId));

    if (userMemberships.length <= 1) {
      throw new Error('Cannot leave your last band. Create or join another band first.');
    }

    // Remove membership
    await this.db
      .delete(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  }

  /**
   * Get a specific member
   */
  async getMember(
    orgId: string,
    userId: string
  ): Promise<MemberResponse | null> {
    const [membership] = await this.db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      return null;
    }

    // Get user details
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

    return {
      id: membership.id,
      orgId: membership.orgId,
      userId: membership.userId,
      role: membership.role as OrgRole,
      createdAt: new Date(membership.createdAt),
      updatedAt: new Date(membership.updatedAt),
      user: {
        id: membership.userId,
        name: profile?.fullName ?? null,
        email: identity?.email ?? '',
        avatarUrl: profile?.avatarUrl ?? null,
      },
    };
  }
}
