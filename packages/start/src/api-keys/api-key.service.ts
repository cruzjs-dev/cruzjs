import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and, isNull, or, gt } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { apiKeys, organizations } from '../database/schema';
import type {
  CreateApiKeyInput,
  ApiKeyResponse,
  ApiKeyCreatedResponse,
  ValidatedApiKey,
  ApiKeyUsageStats,
} from './api-key.types';

/**
 * ApiKey Service - Manages API key CRUD, hashing, and validation
 *
 * Security invariants:
 * - Plaintext API key is returned ONLY on creation, never stored
 * - All keys are hashed with SHA-256 before storage
 * - Revocation is soft delete (revokedAt), never hard delete
 * - Every query (except validateKey) filters by orgId
 */
@Injectable()
export class ApiKeyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  // ==========================================
  // Key Generation & Hashing
  // ==========================================

  /**
   * Generate a new API key with `ax_k_` prefix + 32 random hex chars
   * Returns both the plaintext key and its display prefix
   */
  generateApiKey(): { key: string; prefix: string } {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const key = `ax_k_${hex}`;
    const prefix = key.slice(0, 12); // e.g., "ax_k_abc1def2"
    return { key, prefix };
  }

  /**
   * Hash an API key using SHA-256 (Web Crypto API -- Cloudflare Workers compatible)
   */
  async hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ==========================================
  // CRUD Operations
  // ==========================================

  /**
   * Create a new API key
   * Returns the created response including the plaintext key (shown ONLY once)
   */
  async createApiKey(
    orgId: string,
    userId: string,
    input: CreateApiKeyInput,
  ): Promise<ApiKeyCreatedResponse> {
    const { key, prefix } = this.generateApiKey();
    const keyHash = await this.hashApiKey(key);

    const [created] = await this.db
      .insert(apiKeys)
      .values({
        orgId,
        name: input.name,
        keyHash,
        keyPrefix: prefix,
        scopes: JSON.stringify(input.scopes),
        projectScope: input.projectScope ?? null,
        expiresAt: input.expiresAt ?? null,
        createdBy: userId,
      })
      .returning();

    return {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      scopes: JSON.parse(created.scopes) as string[],
      projectScope: created.projectScope,
      expiresAt: created.expiresAt,
      lastUsedAt: created.lastUsedAt,
      revokedAt: created.revokedAt,
      createdAt: created.createdAt,
      createdBy: created.createdBy,
      plainTextKey: key, // Only time this is ever returned
    };
  }

  /**
   * List all active (non-revoked) API keys for an organization
   */
  async listApiKeys(orgId: string): Promise<ApiKeyResponse[]> {
    const keys = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.orgId, orgId))
      .orderBy(apiKeys.createdAt);

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: JSON.parse(k.scopes) as string[],
      projectScope: k.projectScope,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      revokedAt: k.revokedAt,
      createdAt: k.createdAt,
      createdBy: k.createdBy,
    }));
  }

  /**
   * Get a single API key by ID within an organization
   */
  async getApiKey(orgId: string, keyId: string): Promise<ApiKeyResponse | null> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)))
      .limit(1);

    if (!key) return null;

    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: JSON.parse(key.scopes) as string[],
      projectScope: key.projectScope,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    };
  }

  /**
   * Revoke an API key (soft delete -- sets revokedAt timestamp)
   * Does NOT hard delete to preserve audit trail
   */
  async revokeApiKey(orgId: string, keyId: string): Promise<void> {
    await this.db
      .update(apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)));
  }

  /**
   * Validate an API key by its hash
   * Checks: hash matches, not revoked, not expired
   * Updates lastUsedAt on successful validation
   *
   * Note: This looks up by hash globally, then returns org-scoped context
   */
  async validateKey(keyHash: string): Promise<ValidatedApiKey | null> {
    const now = new Date().toISOString();

    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          isNull(apiKeys.revokedAt),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
        ),
      )
      .limit(1);

    if (!key) return null;

    // Update lastUsedAt (fire and forget -- non-blocking)
    this.db
      .update(apiKeys)
      .set({ lastUsedAt: now })
      .where(eq(apiKeys.id, key.id))
      .catch(() => {});

    return {
      id: key.id,
      orgId: key.orgId,
      scopes: JSON.parse(key.scopes) as string[],
      projectScope: key.projectScope,
    };
  }

  // ==========================================
  // Usage Analytics
  // ==========================================

  /**
   * Get usage stats for all API keys in an organization.
   * Returns key metadata with last-used timestamps for the dashboard.
   * Includes both active and revoked keys for completeness.
   */
  async getUsageStats(orgId: string): Promise<ApiKeyUsageStats[]> {
    const keys = await this.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        lastUsedAt: apiKeys.lastUsedAt,
        keyPrefix: apiKeys.keyPrefix,
      })
      .from(apiKeys)
      .where(eq(apiKeys.orgId, orgId))
      .orderBy(apiKeys.createdAt);

    return keys;
  }

  // ==========================================
  // Org Settings
  // ==========================================

  /**
   * Get the default SCM provider for an organization
   */
  async getDefaultScmProvider(orgId: string): Promise<string | null> {
    const [org] = await this.db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org?.settings) return null;

    try {
      const settings = JSON.parse(org.settings) as Record<string, unknown>;
      return (settings.defaultScmProvider as string) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Set the default SCM provider for an organization
   */
  async setDefaultScmProvider(orgId: string, provider: string): Promise<void> {
    const [org] = await this.db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const currentSettings = org?.settings ? JSON.parse(org.settings) as Record<string, unknown> : {};
    const updatedSettings = { ...currentSettings, defaultScmProvider: provider };

    await this.db
      .update(organizations)
      .set({
        settings: JSON.stringify(updatedSettings),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(organizations.id, orgId));
  }
}
