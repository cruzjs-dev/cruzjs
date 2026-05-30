/**
 * Auth Module
 *
 * Contains authentication and authorization services.
 */

import { Module } from '../di';
import { AuthService } from './auth.service';
import { authTrpc } from './auth.trpc';
import { OAuthService } from './oauth.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { USER_HYDRATOR, NoOpUserHydrator } from './interfaces/user-hydrator.interface';
import { UserRegisteredEvent } from './events/user-registered.event';
import { sendWelcomeEmailListener } from './listeners/send-welcome-email.listener';

@Module({
  providers: [
    AuthService,
    SessionService,
    TokenService,
    OAuthService,

    // Default no-op user hydrator - apps can rebind this with their own implementation
    { provide: USER_HYDRATOR, useClass: NoOpUserHydrator },
  ],
  trpcRouters: {
    auth: authTrpc,
  },
  events: [
    { event: UserRegisteredEvent, listener: sendWelcomeEmailListener },
  ],
})
export class AuthModule {}
