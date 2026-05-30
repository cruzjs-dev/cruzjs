import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { injectable, inject } from 'inversify';
import { authIdentity } from '@cruzjs/core/database/schema';
import { userProfile } from '@cruzjs/start/database/schema';
import { eq, and, desc, like, isNotNull, isNull } from 'drizzle-orm';

export type UserFilters = {
  email?: string;
  name?: string;
  status?: 'active' | 'suspended';
  emailVerified?: boolean;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedUsers = {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    avatarUrl: string | null;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Admin user management service
 */
@injectable()
export class AdminUserService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}
  /**
   * List all users with filtering and pagination
   */
  async listUsers(
    filters: UserFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedUsers> {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 50;
    const skip = (page - 1) * pageSize;

    // Build identity conditions
    const identityConditions = [];
    if (filters.email) {
      identityConditions.push(like(authIdentity.email, `%${filters.email}%`));
    }
    if (filters.emailVerified !== undefined) {
      if (filters.emailVerified) {
        identityConditions.push(isNotNull(authIdentity.emailVerified));
      } else {
        identityConditions.push(isNull(authIdentity.emailVerified));
      }
    }
    const identityWhere = identityConditions.length > 0 ? and(...identityConditions) : undefined;

    // Fetch identities with conditions
    const identities = await this.db
      .select()
      .from(authIdentity)
      .where(identityWhere)
      .orderBy(desc(authIdentity.createdAt));

    // Fetch all profiles
    const profiles = await this.db.select().from(userProfile);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Filter by name if specified (requires profile data)
    let filteredIdentities = identities;
    if (filters.name) {
      const lowerName = filters.name.toLowerCase();
      filteredIdentities = identities.filter((identity) => {
        const profile = profileMap.get(identity.id);
        return profile?.fullName?.toLowerCase().includes(lowerName);
      });
    }

    // Get total count after filtering
    const total = filteredIdentities.length;

    // Apply pagination
    const paginatedIdentities = filteredIdentities.slice(skip, skip + pageSize);

    return {
      users: paginatedIdentities.map((identity) => {
        const profile = profileMap.get(identity.id);
        return {
          id: identity.id,
          email: identity.email,
          name: profile?.fullName ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
          isAdmin: profile?.isAdmin ?? false,
          emailVerified: identity.emailVerified !== null,
          createdAt: new Date(identity.createdAt),
          updatedAt: new Date(identity.updatedAt),
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);

    if (!identity) {
      throw new Error('User not found');
    }

    const [profile] = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);

    return {
      id: identity.id,
      email: identity.email,
      name: profile?.fullName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      isAdmin: profile?.isAdmin ?? false,
      emailVerified: identity.emailVerified !== null,
      createdAt: new Date(identity.createdAt),
      updatedAt: new Date(identity.updatedAt),
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: {
    name?: string;
    email?: string;
    emailVerified?: boolean;
    isAdmin?: boolean;
  }) {
    // Update identity fields (email, emailVerified)
    const identityUpdate: {
      email?: string;
      emailVerified?: string | null;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (data.email !== undefined) identityUpdate.email = data.email;
    if (data.emailVerified !== undefined) {
      identityUpdate.emailVerified = data.emailVerified ? new Date().toISOString() : null;
    }

    await this.db
      .update(authIdentity)
      .set(identityUpdate)
      .where(eq(authIdentity.id, userId));

    // Update profile fields (name, isAdmin)
    if (data.name !== undefined || data.isAdmin !== undefined) {
      const profileUpdate: {
        fullName?: string;
        isAdmin?: boolean;
        updatedAt: string;
      } = {
        updatedAt: new Date().toISOString(),
      };

      if (data.name !== undefined) profileUpdate.fullName = data.name;
      if (data.isAdmin !== undefined) profileUpdate.isAdmin = data.isAdmin;

      await this.db
        .update(userProfile)
        .set(profileUpdate)
        .where(eq(userProfile.userId, userId));
    }

    // Return updated user
    return this.getUser(userId);
  }

  /**
   * Delete user (cascades to profile via FK)
   */
  async deleteUser(userId: string) {
    await this.db.delete(authIdentity).where(eq(authIdentity.id, userId));
  }
}
