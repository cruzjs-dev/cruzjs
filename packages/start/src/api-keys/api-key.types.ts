import { z } from 'zod';
import { ApiKeyScopeValues } from '../database/schema';

// ============================================================================
// API Key Zod Schemas
// ============================================================================

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  scopes: z
    .array(z.enum(ApiKeyScopeValues))
    .min(1, 'At least one scope is required'),
  projectScope: z.string().nullable().optional(), // null = org-wide, or specific projectId
  expiresAt: z.string().nullable().optional(), // ISO 8601 string
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const revokeApiKeySchema = z.object({
  keyId: z.string().min(1),
});

export const getApiKeySchema = z.object({
  keyId: z.string().min(1),
});

// ============================================================================
// API Key Response Types
// ============================================================================

/** Response type for API key listing -- never exposes keyHash */
export type ApiKeyResponse = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  projectScope: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

/** Response type returned ONLY on creation -- includes plaintext key */
export type ApiKeyCreatedResponse = ApiKeyResponse & {
  plainTextKey: string;
};

// ============================================================================
// Validated API Key Context (set by middleware after authentication)
// ============================================================================

export type ValidatedApiKey = {
  id: string;
  orgId: string;
  scopes: string[];
  projectScope: string | null;
};

// ============================================================================
// API Key Context (for dual-auth pattern)
// ============================================================================

/**
 * Context provided when a request is authenticated via API key.
 * Available as `ctx.apiKey` in procedures using `apiTokenProcedure` or `apiKeyProcedure`.
 *
 * When auth is via session, `ctx.apiKey` will be `null`.
 */
export type ApiKeyContext = {
  orgId: string;
  scopes: string[];
  keyId: string;
};

// ============================================================================
// Usage Analytics Types
// ============================================================================

/**
 * Aggregated usage stats for an API key.
 * Returned by `ApiKeyService.getUsageStats()` for the dashboard.
 */
export type ApiKeyUsageStats = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  keyPrefix: string;
};

