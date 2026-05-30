/**
 * Magic Link / Passwordless Auth Types
 *
 * Core types for the magic link authentication system.
 */

export type MagicLink = {
  id: string;
  userId: string | null;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  ipAddress: string | null;
  redirectTo: string | null;
  createdAt: Date;
};

export type RequestMagicLinkInput = {
  email: string;
  redirectTo?: string;
  ipAddress?: string;
};

export type VerifyMagicLinkResult =
  | { success: true; userId: string; email: string; isNewUser: boolean; redirectTo: string | null }
  | { success: false; reason: 'invalid' | 'expired' | 'used' };

export type MagicLinkConfig = {
  expiryMinutes: number;
  maxRequestsPerHour: number;
  tokenByteLength: number;
  autoRegister: boolean;
};

export const DEFAULT_MAGIC_LINK_CONFIG = {
  expiryMinutes: 15,
  maxRequestsPerHour: 5,
  tokenByteLength: 32,
  autoRegister: true,
} satisfies MagicLinkConfig;
