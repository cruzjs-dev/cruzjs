import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { authIdentity } from '../database/schema';
import { AuthService } from '@cruzjs/core/auth/auth.service';
import { userProfile, type UserProfile, type NewUserProfile } from '../database/schema';

// Input types — intersection preserves Drizzle's index signature (Omit strips it)
export type CreateUserProfileInput = NewUserProfile & { id: string };

export type UpdateUserProfileInput = {
  fullName?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  timezone?: string | null;
  preferences?: string;
  onboardingCompleted?: boolean;
  featureOnboarding?: Record<string, string>;
};

export type UpdateUserInput = {
  name?: string;
  avatarUrl?: string | null;
};

// Response types
export type UserProfileResponse = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  timezone: string | null;
  isAdmin: boolean;
  onboardingCompleted: boolean | null;
};

export type UserResponse = {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * UserProfile Service - Manages user profile data
 *
 * Consolidates both raw profile operations and user-facing API operations.
 * This is app-owned - developers can extend with additional fields.
 */
@Injectable()
export class UserProfileService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  // ==========================================
  // Profile Operations (raw profile data)
  // ==========================================

  /**
   * Create a new user profile
   */
  async createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const [profile] = await this.db
      .insert(userProfile)
      .values(input)
      .returning();

    return profile;
  }

  /**
   * Get profile by identity ID
   */
  async getProfile(identityId: string): Promise<UserProfile | null> {
    const [profile] = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, identityId))
      .limit(1);

    return profile || null;
  }

  /**
   * Update profile
   */
  async updateProfile(
    identityId: string,
    input: UpdateUserProfileInput
  ): Promise<UserProfile> {
    // Convert featureOnboarding to JSON string if provided
    const updateData: Record<string, unknown> = { ...input };
    if (input.featureOnboarding) {
      updateData.featureOnboarding = JSON.stringify(input.featureOnboarding);
    }
    updateData.updatedAt = new Date().toISOString();

    const [updated] = await this.db
      .update(userProfile)
      .set(updateData)
      .where(eq(userProfile.userId, identityId))
      .returning();

    if (!updated) {
      throw new Error('Profile not found');
    }

    return updated;
  }

  /**
   * Get multiple profiles by IDs
   */
  async getProfiles(identityIds: string[]): Promise<UserProfile[]> {
    if (identityIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(userProfile)
      .where(inArray(userProfile.id, identityIds));
  }

  /**
   * Convert to profile response format
   */
  toProfileResponse(profile: UserProfile): UserProfileResponse {
    return {
      id: profile.id,
      fullName: profile.fullName ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      phoneNumber: profile.phoneNumber ?? null,
      timezone: profile.timezone ?? null,
      isAdmin: profile.isAdmin ?? false,
      onboardingCompleted: profile.onboardingCompleted ?? null,
    };
  }

  // ==========================================
  // User Operations (combined identity + profile)
  // ==========================================

  /**
   * Get user by ID (joins identity + profile)
   */
  async getUser(userId: string): Promise<UserResponse> {
    // Fetch identity and profile separately to avoid complex join typing
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
      emailVerified: identity.emailVerified ? new Date(identity.emailVerified) : null,
      name: profile?.fullName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      isAdmin: profile?.isAdmin ?? false,
      createdAt: new Date(identity.createdAt),
      updatedAt: new Date(identity.updatedAt),
    };
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<UserResponse> {
    const profileUpdate: Record<string, unknown> = {};
    if (input.name !== undefined) profileUpdate.fullName = input.name;
    if (input.avatarUrl !== undefined) profileUpdate.avatarUrl = input.avatarUrl;

    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.updatedAt = new Date().toISOString();
      await this.db
        .update(userProfile)
        .set(profileUpdate)
        .where(eq(userProfile.userId, userId));
    }

    return this.getUser(userId);
  }

  /**
   * Mark a feature onboarding as completed
   */
  async markFeatureOnboardingComplete(
    userId: string,
    featureKey: string
  ): Promise<UserProfile> {
    // Get current profile
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Parse existing onboarding data (stored as JSON string)
    const currentOnboarding = profile.featureOnboarding
      ? (typeof profile.featureOnboarding === 'string'
          ? JSON.parse(profile.featureOnboarding)
          : profile.featureOnboarding)
      : {};
    const updatedOnboarding = {
      ...currentOnboarding,
      [featureKey]: new Date().toISOString(),
    };

    const [updated] = await this.db
      .update(userProfile)
      .set({
        featureOnboarding: JSON.stringify(updatedOnboarding),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfile.userId, userId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update profile');
    }

    return updated;
  }

  /**
   * Check if a feature onboarding has been completed
   */
  async hasCompletedFeatureOnboarding(
    userId: string,
    featureKey: string
  ): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return false;
    }

    const onboarding = profile.featureOnboarding
      ? (typeof profile.featureOnboarding === 'string'
          ? JSON.parse(profile.featureOnboarding)
          : profile.featureOnboarding)
      : {};
    return !!onboarding[featureKey];
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user's current password hash
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);

    if (!identity || !identity.password) {
      throw new Error('User not found or no password set');
    }

    // Verify current password
    const isValid = await this.authService.verifyPassword(
      currentPassword,
      identity.password
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    if (!this.authService.validatePasswordStrength(newPassword)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, and number'
      );
    }

    // Hash new password and update
    const hashedPassword = await this.authService.hashPassword(newPassword);
    await this.db
      .update(authIdentity)
      .set({ password: hashedPassword, updatedAt: new Date().toISOString() })
      .where(eq(authIdentity.id, userId));
  }
}
