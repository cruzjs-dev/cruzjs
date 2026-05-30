/**
 * Two-Factor Authentication Enforcement
 *
 * Per-org 2FA enforcement policy and tRPC middleware that enforces
 * the 2FA requirement before allowing access to protected routes.
 */

import { TRPCError } from '@trpc/server';
import { TwoFactorMethod } from './two-factor.types';
import { TwoFactorService } from './two-factor.service';

/**
 * Per-org 2FA enforcement policy configuration.
 */
export interface TwoFactorPolicy {
  /** Whether 2FA is required for the org */
  required: boolean;
  /** Which 2FA methods are allowed */
  allowedMethods: TwoFactorMethod[];
  /** Days users have to comply before lockout */
  gracePeriodDays: number;
}

const DEFAULT_POLICY: TwoFactorPolicy = {
  required: false,
  allowedMethods: [TwoFactorMethod.TOTP, TwoFactorMethod.SMS, TwoFactorMethod.EMAIL],
  gracePeriodDays: 14,
};

/**
 * Create a tRPC middleware that enforces 2FA requirements.
 *
 * When applied, this middleware checks if the current user has 2FA enabled.
 * If the org policy requires 2FA and the user hasn't set it up, the request
 * is rejected with a FORBIDDEN error.
 *
 * @param policyOverrides - Optional partial policy to merge with defaults
 * @returns tRPC middleware function
 *
 * @example
 * ```typescript
 * const enforced2FA = twoFactorMiddleware({ required: true });
 *
 * @Route() sensitiveAction = orgProcedure
 *   .use(enforced2FA)
 *   .mutation(async ({ ctx }) => { ... });
 * ```
 */
export function twoFactorMiddleware(policyOverrides?: Partial<TwoFactorPolicy>) {
  const policy: TwoFactorPolicy = { ...DEFAULT_POLICY, ...policyOverrides };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ ctx, next }: { ctx: any; next: () => Promise<any> }) => {
    if (!policy.required) {
      return next();
    }

    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Resolve TwoFactorService from the DI container
    const twoFactorService = ctx.container?.resolve(TwoFactorService) as TwoFactorService | undefined;
    if (!twoFactorService) {
      // If service is not available, allow through (2FA module not loaded)
      return next();
    }

    const isEnabled = await twoFactorService.isEnabled(userId);

    if (!isEnabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Two-factor authentication is required. Please enable 2FA in your account settings.',
      });
    }

    // Check that the user's method is in the allowed list
    const methods = await twoFactorService.getMethods(userId);
    const hasAllowedMethod = methods.some((m) => policy.allowedMethods.includes(m));

    if (!hasAllowedMethod) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Two-factor authentication must use one of: ${policy.allowedMethods.join(', ')}`,
      });
    }

    return next();
  };
}
