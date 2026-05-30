// Service
export { UserProfileService } from './user-profile.service';
export type {
  CreateUserProfileInput,
  UpdateUserProfileInput,
  UpdateUserInput,
  UserProfileResponse,
  UserResponse,
} from './user-profile.service';

// Router
export { userProfileTrpc } from './user-profile.trpc';

// Module
export { UserProfileModule } from './user-profile.module';

// Hydrator
export { UserProfileHydrator } from './user-profile.hydrator';

// Components
export * from './components';
