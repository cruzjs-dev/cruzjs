import { Module, getToken } from '@cruzjs/core/di';
import { USER_HYDRATOR } from '@cruzjs/core/auth/interfaces/user-hydrator.interface';
import { IdentityCreatedEvent } from '@cruzjs/core/auth/events/identity-created.event';
import { UserProfileService } from './user-profile.service';
import { UserProfileHydrator } from './user-profile.hydrator';
import { userProfileTrpc } from './user-profile.trpc';

/**
 * UserProfile Module
 *
 * Registers user profile services, the hydrator binding, and
 * listens for identity creation events to auto-create profiles.
 */
@Module({
  providers: [
    UserProfileService,
    UserProfileHydrator,
    { provide: USER_HYDRATOR, useClass: UserProfileHydrator },
  ],
  trpcRouters: {
    userProfile: userProfileTrpc,
  },
  events: [
    {
      event: IdentityCreatedEvent,
      listener: async (event: IdentityCreatedEvent, container) => {
        const svc = container!.get(UserProfileService);
        await svc.createProfile({
          id: event.identityId,
          userId: event.identityId,
          fullName: event.initialName || null,
          avatarUrl: `https://avatar.vercel.sh/${event.email}`,
          isAdmin: false,
          onboardingCompleted: false,
        });
      },
    },
  ],
})
export class UserProfileModule {}
