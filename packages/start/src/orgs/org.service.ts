import { injectable, inject } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { organizations, orgMembers } from '@cruzjs/core/database/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import type {
  CreateOrgInput,
  OrganizationResponse,
  OrganizationWithStats,
  UpdateOrgInput,
} from '@cruzjs/core/orgs/org.models';
import { generateSlug, generateUniqueSlug } from './slug.utils';

// Type for org query result with joined fields
type OrgQueryResult = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  settings: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Parse settings JSON string to object
 */
function parseSettings(settings: string | null): Record<string, unknown> | null {
  if (!settings) return null;
  try {
    return JSON.parse(settings) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Stringify settings object to JSON
 */
function stringifySettings(settings: Record<string, unknown> | null | undefined): string | null {
  if (!settings) return null;
  return JSON.stringify(settings);
}

/**
 * Organization service for CRUD operations
 */
@injectable()
export class OrgService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Create a new organization and add creator as OWNER
   */
  async createOrg(
    data: CreateOrgInput,
    ownerId: string
  ): Promise<OrganizationResponse> {
    // Generate slug from name if not provided
    const baseSlug = data.slug || generateSlug(data.name);

    // Ensure slug is unique (excluding soft-deleted orgs)
    const slug = await generateUniqueSlug(baseSlug, async (s) => {
      const [existing] = await this.db
        .select()
        .from(organizations)
        .where(and(eq(organizations.slug, s), isNull(organizations.deletedAt)))
        .limit(1);
      return !!existing;
    });

    // Create organization and owner membership
    const now = new Date().toISOString();

    // Insert organization
    const [org] = await this.db
      .insert(organizations)
      .values({
        name: data.name,
        slug,
        ownerId,
        avatarUrl: data.avatarUrl || null,
        settings: stringifySettings(data.settings),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create owner membership
    await this.db.insert(orgMembers).values({
      orgId: org.id,
      userId: ownerId,
      role: 'OWNER',
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      avatarUrl: org.avatarUrl,
      settings: parseSettings(org.settings),
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
    };
  }

  /**
   * Get organization by ID (excluding soft-deleted)
   */
  async getOrg(orgId: string): Promise<OrganizationResponse | null> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
      .limit(1);

    if (!org) {
      return null;
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      avatarUrl: org.avatarUrl,
      settings: parseSettings(org.settings),
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
    };
  }

  /**
   * Get organization by slug (excluding soft-deleted)
   */
  async getOrgBySlug(slug: string): Promise<OrganizationResponse | null> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)))
      .limit(1);

    if (!org) {
      return null;
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      avatarUrl: org.avatarUrl,
      settings: parseSettings(org.settings),
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
    };
  }

  /**
   * Update organization
   */
  async updateOrg(
    orgId: string,
    data: UpdateOrgInput
  ): Promise<OrganizationResponse> {
    // If slug is being updated, ensure it's unique (excluding soft-deleted orgs)
    let slug = data.slug;
    if (slug) {
      slug = await generateUniqueSlug(generateSlug(slug), async (s) => {
        const [existing] = await this.db
          .select()
          .from(organizations)
          .where(and(eq(organizations.slug, s), isNull(organizations.deletedAt)))
          .limit(1);
        // Allow if it's the same organization
        return existing ? existing.id !== orgId : false;
      });
    }

    // Check if org is soft-deleted
    const [existingOrg] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!existingOrg || existingOrg.deletedAt) {
      throw new Error('Organization not found');
    }

    const updateData: {
      name?: string;
      slug?: string;
      avatarUrl?: string | null;
      settings?: string | null;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (slug !== undefined) {
      updateData.slug = slug;
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl || null;
    }
    if (data.settings !== undefined) {
      updateData.settings = stringifySettings(data.settings);
    }

    const [org] = await this.db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, orgId))
      .returning();

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      avatarUrl: org.avatarUrl,
      settings: parseSettings(org.settings),
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
    };
  }

  /**
   * Soft delete organization
   */
  async deleteOrg(orgId: string): Promise<void> {
    // Check if org exists and is not already deleted
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

    // Soft delete by setting deletedAt timestamp
    await this.db
      .update(organizations)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(organizations.id, orgId));
  }

  /**
   * List organizations for a user (excluding soft-deleted)
   */
  async listUserOrgs(userId: string): Promise<OrganizationResponse[]> {
    // Get user's memberships first
    const memberships = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId))
      .orderBy(asc(orgMembers.createdAt));

    if (memberships.length === 0) {
      return [];
    }

    // Get all non-deleted organizations
    const allOrgs = await this.db
      .select()
      .from(organizations)
      .where(isNull(organizations.deletedAt));

    // Create lookup map
    const orgMap = new Map(allOrgs.map((o) => [o.id, o]));

    // Filter and map
    return memberships
      .map((m) => orgMap.get(m.orgId))
      .filter((org): org is NonNullable<typeof org> => org !== undefined)
      .map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        avatarUrl: org.avatarUrl,
        settings: parseSettings(org.settings),
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
      }));
  }

  /**
   * Get organization with statistics (member count) - excluding soft-deleted
   */
  async getOrgWithStats(
    orgId: string
  ): Promise<OrganizationWithStats | null> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
      .limit(1);

    if (!org) {
      return null;
    }

    const members = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      avatarUrl: org.avatarUrl,
      settings: parseSettings(org.settings),
      createdAt: new Date(org.createdAt),
      updatedAt: new Date(org.updatedAt),
      memberCount: members.length,
    };
  }
}
