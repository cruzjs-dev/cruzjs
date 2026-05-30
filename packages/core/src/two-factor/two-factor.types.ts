/**
 * Two-Factor Authentication Types
 *
 * Core types for the 2FA system including TOTP, SMS, and email methods.
 */

import { createToken } from '../di/tokens/create-token';

export const TwoFactorMethod = {
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
} as const;
export type TwoFactorMethod = typeof TwoFactorMethod[keyof typeof TwoFactorMethod];

export interface TwoFactorSecret {
  id: string;
  userId: string;
  method: TwoFactorMethod;
  secret: string;      // encrypted
  verified: boolean;
  enabledAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceFingerprint: string;
  label: string;
  trustedUntil: Date;
  createdAt: Date;
}

export interface BackupCode {
  code: string;    // raw code shown to user once
  hash: string;    // SHA-256 hash stored
  usedAt: Date | null;
}

export interface TOTPSetupResult {
  secret: string;
  qrCodeUri: string;   // otpauth:// URI for QR code
}

export interface TwoFactorStatus {
  enabled: boolean;
  methods: TwoFactorMethod[];
}

/** DI token for injecting a platform-specific TwoFactorAdapter */
export const TWO_FACTOR_ADAPTER = createToken<import('./two-factor.adapter').TwoFactorAdapter>('TWO_FACTOR_ADAPTER');
