/**
 * Two-Factor Authentication tRPC Router (OOP)
 *
 * User-scoped endpoints for managing 2FA: setup TOTP, verify, disable,
 * manage backup codes, and trusted devices.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { Inject } from '../di';
import { protectedProcedure } from '../trpc/context';
import { TwoFactorService } from './two-factor.service';
import {
  verifySetupSchema,
  disableSchema,
  revokeTrustedDeviceSchema,
} from './two-factor.validation';

@Router()
export class TwoFactorTrpc extends TrpcRouter {
  @Inject(TwoFactorService) private service!: TwoFactorService;

  /** Begin TOTP setup — returns secret + otpauth URI for QR code */
  @Route() setupTOTP = protectedProcedure.mutation(async ({ ctx }) =>
    this.service.setupTOTP(ctx.session.user.id),
  );

  /** Verify TOTP setup with a code — returns backup codes on success */
  @Route() verifySetup = protectedProcedure
    .input(verifySetupSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await this.service.verifyTOTPSetup(ctx.session.user.id, input.code);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Verification failed',
        });
      }
    });

  /** Disable 2FA (optionally for a specific method) */
  @Route() disable = protectedProcedure
    .input(disableSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.disable(ctx.session.user.id, input.method);
      return { success: true };
    });

  /** Regenerate backup codes */
  @Route() generateBackupCodes = protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await this.service.generateBackupCodes(ctx.session.user.id);
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Failed to generate backup codes',
      });
    }
  });

  /** List trusted devices */
  @Route() listTrustedDevices = protectedProcedure.query(async ({ ctx }) =>
    this.service.listTrustedDevices(ctx.session.user.id),
  );

  /** Revoke a trusted device */
  @Route() revokeTrustedDevice = protectedProcedure
    .input(revokeTrustedDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.revokeTrustedDevice(ctx.session.user.id, input.deviceId);
      return { success: true };
    });

  /** Get 2FA status — whether enabled and which methods */
  @Route() getStatus = protectedProcedure.query(async ({ ctx }) => {
    const [enabled, methods] = await Promise.all([
      this.service.isEnabled(ctx.session.user.id),
      this.service.getMethods(ctx.session.user.id),
    ]);
    return { enabled, methods };
  });
}
