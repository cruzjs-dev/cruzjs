import { Injectable, Inject } from '@cruzjs/core/di';
import {
  IUserHydrator,
  HydratedUser,
} from '@cruzjs/core/auth/interfaces/user-hydrator.interface';
import { UserProfileService } from './user-profile.service';

/**
 * UserProfile Hydrator
 *
 * Implements the IUserHydrator interface to inject profile data into the session context.
 * This allows Core's auth middleware to stay decoupled from profile data.
 */
@Injectable()
export class UserProfileHydrator implements IUserHydrator {
  constructor(
    @Inject(UserProfileService) private readonly userProfileService: UserProfileService
  ) {}

  async hydrate(identityId: string, _email: string): Promise<Partial<HydratedUser>> {
    const profile = await this.userProfileService.getProfile(identityId);

    if (!profile) {
      return {};
    }

    return {
      profile: {
        fullName: profile.fullName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        isAdmin: profile.isAdmin ?? false,
        timezone: profile.timezone ?? null,
      },
    };
  }
}
