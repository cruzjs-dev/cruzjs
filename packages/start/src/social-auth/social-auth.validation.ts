/**
 * Social Auth Validation Schemas
 *
 * Zod schemas for tRPC input validation.
 */

import { z } from 'zod';
import { SOCIAL_PROVIDER_VALUES } from './social-auth.types';

/** Validate a string is a known social provider */
const providerSchema = z.string().min(1).max(50);

/** Input for generating an OAuth authorization URL */
export const getAuthUrlSchema = z.object({
  provider: providerSchema,
  redirectUri: z.string().url(),
});

/** Input for handling OAuth callback */
export const handleCallbackSchema = z.object({
  provider: providerSchema,
  code: z.string().min(1),
  state: z.string().min(1),
  redirectUri: z.string().url(),
});

/** Input for disconnecting a social provider */
export const disconnectSchema = z.object({
  provider: providerSchema,
});

/** Input for getting a specific connection */
export const getConnectionSchema = z.object({
  provider: providerSchema,
});

/** Input for syncing a social account profile */
export const syncAccountSchema = z.object({
  provider: providerSchema,
});

// Type exports
export type GetAuthUrlInput = z.infer<typeof getAuthUrlSchema>;
export type HandleCallbackInput = z.infer<typeof handleCallbackSchema>;
export type DisconnectInput = z.infer<typeof disconnectSchema>;
export type GetConnectionInput = z.infer<typeof getConnectionSchema>;
export type SyncAccountInput = z.infer<typeof syncAccountSchema>;
