/**
 * Two-Factor Authentication Validation Schemas
 *
 * Zod schemas for 2FA operations.
 */

import { z } from 'zod';

// ─── Setup & Verification ────────────────────────────────────────────────────

export const verifySetupSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

export type VerifySetupInput = z.infer<typeof verifySetupSchema>;

// ─── Disable ─────────────────────────────────────────────────────────────────

export const disableSchema = z.object({
  method: z.enum(['totp', 'sms', 'email']).optional(),
});

export type DisableInput = z.infer<typeof disableSchema>;

// ─── Verify Code ─────────────────────────────────────────────────────────────

export const verifyCodeSchema = z.object({
  code: z.string().min(1).max(20),
  method: z.enum(['totp', 'sms', 'email']).optional(),
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

// ─── Trusted Devices ─────────────────────────────────────────────────────────

export const revokeTrustedDeviceSchema = z.object({
  deviceId: z.string().min(1),
});

export type RevokeTrustedDeviceInput = z.infer<typeof revokeTrustedDeviceSchema>;

export const trustDeviceSchema = z.object({
  fingerprint: z.string().min(1).max(500),
  label: z.string().min(1).max(200),
  daysToTrust: z.number().int().min(1).max(365).default(30),
});

export type TrustDeviceInput = z.infer<typeof trustDeviceSchema>;

// ─── Send OTP ────────────────────────────────────────────────────────────────

export const sendOTPSchema = z.object({
  method: z.enum(['sms', 'email']),
});

export type SendOTPInput = z.infer<typeof sendOTPSchema>;
