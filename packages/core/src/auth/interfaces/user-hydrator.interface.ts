/**
 * User Hydrator Interface
 *
 * This interface defines the contract for hydrating user data from Identity.
 * The app implements this to inject profile data (name, avatar, etc.) into requests.
 *
 * Core's session middleware only has { id, email } from AuthIdentity.
 * The app's hydrator adds { profile } with name, avatarUrl, etc.
 * Pro's hydrator can add { orgs } with organization memberships.
 */

/**
 * Base hydrated user with core identity fields
 * Note: Date fields are ISO strings for D1/SQLite compatibility
 */
export type HydratedUser = {
  id: string;
  email: string;
  emailVerified: string | null;
  isBanned: boolean;
  profile?: UserProfileData;
  orgs?: UserOrgData[];
};

/**
 * Profile data injected by the app's hydrator
 */
export type UserProfileData = {
  fullName?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  [key: string]: unknown; // Allow app-specific fields
};

/**
 * Organization data injected by Pro's hydrator
 */
export type UserOrgData = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
};

/**
 * Interface for user hydration
 *
 * Implement this interface in your app to inject profile data into the session context.
 */
export interface IUserHydrator {
  /**
   * Hydrate additional user data from identity ID
   *
   * @param identityId - The AuthIdentity ID
   * @param email - The user's email
   * @returns Partial hydrated user data (profile, orgs, etc.)
   */
  hydrate(identityId: string, email: string): Promise<Partial<HydratedUser>>;
}

import { createToken } from '../../di';

/**
 * Injection token for user hydrator
 */
export const USER_HYDRATOR = createToken<IUserHydrator>('UserHydrator');

/**
 * Default no-op hydrator used when app doesn't provide one
 */
export class NoOpUserHydrator implements IUserHydrator {
  async hydrate(_identityId: string, _email: string): Promise<Partial<HydratedUser>> {
    return {};
  }
}
