import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { inject, injectable } from 'inversify';
import { authIdentity } from '@cruzjs/core/database/schema';
import { organizations, orgMembers } from '@cruzjs/core/database/schema';
import { subscriptions } from '../database/schema';
import { userProfile } from '@cruzjs/start/database/schema';
import { eq, and, desc, like, isNull } from 'drizzle-orm';

export type OrgFilters = {
  name?: string;
  subscriptionStatus?: string;
  minMembers?: number;
  maxMembers?: number;
  includeDeleted?: boolean; // Admin can optionally include soft-deleted orgs
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedOrgs = {
  orgs: Array<{
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    subscriptionStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Admin organization management service
 */
@injectable()
export class AdminOrgService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}
  /**
   * List all organizations with filtering and pagination
   */
  async listOrgs(
    filters: OrgFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedOrgs> {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const conditions = [];

    if (filters.name) {
      // Use LIKE for SQLite (case-insensitive with LOWER)
      conditions.push(like(organizations.name, `%${filters.name}%`));
    }

    // By default, exclude soft-deleted orgs unless explicitly requested
    if (!filters.includeDeleted) {
      conditions.push(isNull(organizations.deletedAt));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get organizations
    const orgsData = await this.db
      .select()
      .from(organizations)
      .where(whereClause)
      .orderBy(desc(organizations.createdAt))
      .offset(skip)
      .limit(pageSize);

    // Get subscriptions for these orgs
    const allSubscriptions = await this.db
      .select()
      .from(subscriptions);
    const subscriptionMap = new Map(allSubscriptions.map((s) => [s.orgId, s]));

    // Get all org members to count
    const allMembers = await this.db
      .select()
      .from(orgMembers);

    // Count members per org
    const memberCountMap = new Map<string, number>();
    for (const member of allMembers) {
      memberCountMap.set(member.orgId, (memberCountMap.get(member.orgId) || 0) + 1);
    }

    // Filter by member count and subscription if specified
    let filteredOrgs = orgsData.filter((org) => {
      const memberCount = memberCountMap.get(org.id) || 0;
      if (filters.minMembers !== undefined && memberCount < filters.minMembers) {
        return false;
      }
      if (filters.maxMembers !== undefined && memberCount > filters.maxMembers) {
        return false;
      }
      const subscription = subscriptionMap.get(org.id);
      if (filters.subscriptionStatus && subscription?.status !== filters.subscriptionStatus) {
        return false;
      }
      return true;
    });

    // Get total count
    const allOrgs = await this.db
      .select()
      .from(organizations)
      .where(whereClause);
    const total = allOrgs.length;

    return {
      orgs: filteredOrgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        memberCount: memberCountMap.get(org.id) || 0,
        subscriptionStatus: subscriptionMap.get(org.id)?.status || null,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
      })),
      total: filteredOrgs.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredOrgs.length / pageSize),
    };
  }

  /**
   * Get organization by ID with details
   */
  async getOrg(orgId: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get members
    const membersData = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    // Get identities and profiles for member users
    const userIds = membersData.map((m) => m.userId);
    const identities = userIds.length > 0
      ? await this.db.select().from(authIdentity)
      : [];
    const profiles = userIds.length > 0
      ? await this.db.select().from(userProfile)
      : [];

    const identityMap = new Map(identities.map((i) => [i.id, i]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Get subscription
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, orgId))
      .limit(1);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      settings: org.settings ? JSON.parse(org.settings) : null,
      memberCount: membersData.length,
      members: membersData.map((member) => {
        const identity = identityMap.get(member.userId);
        const profile = profileMap.get(member.userId);
        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          user: {
            id: member.userId,
            email: identity?.email || '',
            name: profile?.fullName ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
          },
          createdAt: new Date(member.createdAt),
        };
      }),
      subscription: subscription || null,
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
    };
  }

  /**
   * Update organization
   */
  async updateOrg(
    orgId: string,
    data: {
      name?: string;
      slug?: string;
      settings?: Record<string, unknown>;
    }
  ) {
    const updateData: {
      name?: string;
      slug?: string;
      settings?: string;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }
    if (data.settings !== undefined) {
      updateData.settings = JSON.stringify(data.settings);
    }

    const [org] = await this.db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, orgId))
      .returning();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get member count
    const members = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    // Get subscription status
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, orgId))
      .limit(1);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      settings: org.settings ? JSON.parse(org.settings) : null,
      avatarUrl: org.avatarUrl,
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
      _count: { members: members.length },
      subscription: subscription ? { status: subscription.status } : null,
    };
  }

  /**
   * Soft delete organization (admin can hard delete if needed)
   */
  async deleteOrg(orgId: string, hardDelete: boolean = false) {
    if (hardDelete) {
      // Hard delete - only for admin use cases
      await this.db.delete(organizations).where(eq(organizations.id, orgId));
      return;
    }

    // Soft delete by default
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    if (org.deletedAt) {
      throw new Error('Organization is already deleted');
    }

    await this.db
      .update(organizations)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(organizations.id, orgId));
  }
}
