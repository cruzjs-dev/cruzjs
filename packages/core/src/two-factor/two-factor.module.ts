/**
 * Two-Factor Authentication Module
 *
 * Registers the TwoFactorService and TwoFactorTrpc router into the DI container.
 * An optional TWO_FACTOR_ADAPTER can be provided to enable SMS/email OTP delivery
 * via platform-specific providers (Twilio, AWS SNS, Azure Communication Services, etc.).
 */

import { Module } from '../di';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorTrpc } from './two-factor.trpc';

@Module({
  providers: [
    TwoFactorService,
    TwoFactorTrpc,
  ],
  trpcRouters: {
    twoFactor: TwoFactorTrpc,
  },
})
export class TwoFactorModule {}
