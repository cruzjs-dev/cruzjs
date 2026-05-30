/**
 * OAuth Service
 *
 * Orchestrates the social OAuth flow: provider registry, state management,
 * callback handling (find-or-create user, link accounts), connection management,
 * token encryption, token refresh, and profile sync.
 */

import { Injectable, Inject, Optional, MultiInject } from '@cruzjs/core/di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { SessionService } from '@cruzjs/core/auth/session.service';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { IdentityCreatedEvent } from '@cruzjs/core/auth/events/identity-created.event';
import { authIdentity } from '@cruzjs/core/database/schema';
import { orgMembers } from '@cruzjs/core/database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { encryptToken, decryptToken } from '@cruzjs/core/shared/encryption';
import { socialAccounts } from './social-auth.schema';
import type { OAuthProvider } from './oauth.provider';
import { OAUTH_PROVIDER } from './oauth.provider';
import type {
  OAuthUserProfile,
  OAuthTokens,
  OAuthCallbackResult,
  SocialAccountInfo,
  OAuthState,
} from './social-auth.types';

// ── PKCE & State utilities ───────────────────────────────────────────────────

/**
 * Generate a cryptographically random string for CSRF state parameters.
 */
export function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a PKCE code verifier (43-128 characters, URL-safe random string).
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes).slice(0, 128);
}

/**
 * Generate a PKCE code challenge from a code verifier.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Encode bytes as base64url (URL-safe base64 without padding).
 */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Validate that a state string matches the expected value.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function validateState(state: string, expected: string): boolean {
  if (!state || !expected) return false;
  if (state.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < state.length; i++) {
    result |= state.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Encode an OAuthState object as a base64url string.
 */
export function encodeOAuthState(stateObj: OAuthState): string {
  const json = JSON.stringify(stateObj);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url-encoded OAuthState string.
 * Returns null if the state is malformed or expired (older than 10 minutes).
 */
export function decodeOAuthState(encoded: string): OAuthState | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const state = JSON.parse(json) as OAuthState;

    // Validate structure
    if (!state.nonce || typeof state.createdAt !== 'number') {
      return null;
    }

    // Check expiry (10 minutes max)
    const MAX_STATE_AGE_MS = 10 * 60 * 1000;
    if (Date.now() - state.createdAt > MAX_STATE_AGE_MS) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SocialOAuthService {
  private readonly providerMap: Map<string, OAuthProvider>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
    @MultiInject(OAUTH_PROVIDER) @Optional() providers: OAuthProvider[] = [],
  ) {
    this.providerMap = new Map();
    for (const provider of providers) {
      this.providerMap.set(provider.name, provider);
    }
  }

  // ── Provider Registry ──────────────────────────────────────────────────

  /**
   * Get a registered OAuth provider by name.
   */
  getProvider(name: string): OAuthProvider | null {
    return this.providerMap.get(name) ?? null;
  }

  /**
   * Get all registered provider names.
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providerMap.keys());
  }

  // ── OAuth Flow ─────────────────────────────────────────────────────────

  /**
   * Handle the OAuth callback after the user authorizes with the provider.
   * Creates or finds the user, optionally links to an existing account,
   * and creates a session.
   */
  async handleCallback(
    providerName: string,
    code: string,
    state: string,
    expectedState: string,
    redirectUri: string,
    currentUserId?: string,
    userAgent?: string,
    ipAddress?: string,
    codeVerifier?: string,
  ): Promise<OAuthCallbackResult> {
    // Validate CSRF state
    if (!validateState(state, expectedState)) {
      throw new Error('Invalid OAuth state parameter');
    }

    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Unknown OAuth provider: ${providerName}`);
    }

    // Exchange code for tokens
    const tokens = await provider.exchangeCode(code, redirectUri, codeVerifier);

    // Fetch user profile from provider
    const profile = await provider.getUserProfile(tokens.accessToken);

    if (currentUserId) {
      // Link to existing user account
      await this.linkToUser(currentUserId, profile, tokens, providerName);
      const [user] = await this.db
        .select()
        .from(authIdentity)
        .where(eq(authIdentity.id, currentUserId))
        .limit(1);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: null,
          emailVerified: user.emailVerified,
        },
        session: { token: '', expiresAt: '' }, // No new session needed for linking
        isNewUser: false,
        accountLinked: true,
      };
    }

    // Find or create user
    const { user, isNewUser } = await this.findOrCreateUser(
      profile,
      tokens,
      providerName,
    );

    // Get user's first organization for session context
    const [firstMembership] = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id))
      .limit(1);

    // Create session
    const session = await this.sessionService.createSession({
      userId: user.id,
      currentOrgId: firstMembership?.orgId || null,
      userAgent,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: null,
        emailVerified: user.emailVerified,
      },
      session: {
        token: session.token,
        expiresAt:
          typeof session.expiresAt === 'string'
            ? session.expiresAt
            : session.expiresAt.toISOString(),
      },
      isNewUser,
      accountLinked: false,
    };
  }

  // ── Connection Management ──────────────────────────────────────────────

  /**
   * List all social connections for a user (safe for client display).
   */
  async listConnections(userId: string): Promise<SocialAccountInfo[]> {
    const accounts = await this.db
      .select({
        id: socialAccounts.id,
        provider: socialAccounts.provider,
        providerUserId: socialAccounts.providerUserId,
        email: socialAccounts.email,
        displayName: socialAccounts.displayName,
        avatarUrl: socialAccounts.avatarUrl,
        scopes: socialAccounts.scopes,
        createdAt: socialAccounts.createdAt,
        lastSyncedAt: socialAccounts.lastSyncedAt,
      })
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, userId));

    return accounts;
  }

  /**
   * Disconnect a social provider from the user's account.
   */
  async disconnect(userId: string, provider: string): Promise<void> {
    await this.db
      .delete(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.provider, provider),
        ),
      );
  }

  /**
   * Get a specific social connection for a user.
   */
  async getConnection(
    userId: string,
    provider: string,
  ): Promise<SocialAccountInfo | null> {
    const [account] = await this.db
      .select({
        id: socialAccounts.id,
        provider: socialAccounts.provider,
        providerUserId: socialAccounts.providerUserId,
        email: socialAccounts.email,
        displayName: socialAccounts.displayName,
        avatarUrl: socialAccounts.avatarUrl,
        scopes: socialAccounts.scopes,
        createdAt: socialAccounts.createdAt,
        lastSyncedAt: socialAccounts.lastSyncedAt,
      })
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.provider, provider),
        ),
      )
      .limit(1);

    return account ?? null;
  }

  // ── Token Refresh ──────────────────────────────────────────────────────

  /**
   * Refresh the access token for a social account.
   * The provider must support token refresh.
   */
  async refreshAccountToken(userId: string, provider: string): Promise<SocialAccountInfo> {
    const [account] = await this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.provider, provider),
        ),
      )
      .limit(1);

    if (!account) {
      throw new Error(`No ${provider} account found for user`);
    }

    const oauthProvider = this.getProvider(provider);
    if (!oauthProvider?.refreshToken) {
      throw new Error(`Provider ${provider} does not support token refresh`);
    }

    if (!account.refreshToken || !account.refreshTokenIv) {
      throw new Error(`No refresh token stored for ${provider} account`);
    }

    // Decrypt current refresh token
    const plainRefreshToken = await decryptToken(account.refreshToken, account.refreshTokenIv);

    // Refresh the token
    const newTokens = await oauthProvider.refreshToken(plainRefreshToken);

    // Encrypt new tokens
    const accessTokenEncrypted = await encryptToken(newTokens.accessToken);
    const updateData: Record<string, unknown> = {
      accessToken: accessTokenEncrypted.encrypted,
      accessTokenIv: accessTokenEncrypted.iv,
      tokenExpiresAt: newTokens.expiresAt?.toISOString() ?? null,
      scopes: newTokens.scopes?.join(' ') ?? account.scopes,
      updatedAt: new Date().toISOString(),
    };

    if (newTokens.refreshToken) {
      const refreshTokenEncrypted = await encryptToken(newTokens.refreshToken);
      updateData.refreshToken = refreshTokenEncrypted.encrypted;
      updateData.refreshTokenIv = refreshTokenEncrypted.iv;
    }

    await this.db
      .update(socialAccounts)
      .set(updateData)
      .where(eq(socialAccounts.id, account.id));

    return this.getConnection(userId, provider) as Promise<SocialAccountInfo>;
  }

  // ── Profile Sync ───────────────────────────────────────────────────────

  /**
   * Sync profile data from the provider for a connected account.
   * Fetches fresh profile data using the stored access token.
   */
  async syncProfile(userId: string, provider: string): Promise<SocialAccountInfo> {
    const [account] = await this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.provider, provider),
        ),
      )
      .limit(1);

    if (!account) {
      throw new Error(`No ${provider} account found for user`);
    }

    if (!account.accessToken || !account.accessTokenIv) {
      throw new Error(`No access token stored for ${provider} account`);
    }

    const oauthProvider = this.getProvider(provider);
    if (!oauthProvider) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    // Decrypt access token
    const plainAccessToken = await decryptToken(account.accessToken, account.accessTokenIv);

    // Check if token is expired and refresh if possible
    let accessToken = plainAccessToken;
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
      if (oauthProvider.refreshToken && account.refreshToken && account.refreshTokenIv) {
        const refreshed = await this.refreshAccountToken(userId, provider);
        // Re-read the updated account to get the new access token
        const [updated] = await this.db
          .select()
          .from(socialAccounts)
          .where(eq(socialAccounts.id, account.id))
          .limit(1);
        if (updated?.accessToken && updated.accessTokenIv) {
          accessToken = await decryptToken(updated.accessToken, updated.accessTokenIv);
        }
      }
    }

    // Fetch fresh profile
    const profile = await oauthProvider.getUserProfile(accessToken);

    // Update stored profile data
    await this.db
      .update(socialAccounts)
      .set({
        email: profile.email,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        username: profile.username ?? null,
        metadata: profile.raw ? JSON.stringify(profile.raw) : account.metadata,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(socialAccounts.id, account.id));

    return this.getConnection(userId, provider) as Promise<SocialAccountInfo>;
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Find an existing user by social account or email, or create a new user.
   */
  private async findOrCreateUser(
    profile: OAuthUserProfile,
    tokens: OAuthTokens,
    provider: string,
  ): Promise<{ user: typeof authIdentity.$inferSelect; isNewUser: boolean }> {
    // Check if social account already exists
    const [existingAccount] = await this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerUserId, profile.providerId),
        ),
      )
      .limit(1);

    if (existingAccount) {
      // Update tokens on existing connection
      const accessTokenEncrypted = await encryptToken(tokens.accessToken);
      const updateData: Record<string, unknown> = {
        accessToken: accessTokenEncrypted.encrypted,
        accessTokenIv: accessTokenEncrypted.iv,
        tokenExpiresAt: tokens.expiresAt?.toISOString() ?? null,
        scopes: tokens.scopes?.join(' ') ?? null,
        email: profile.email,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        username: profile.username ?? null,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (tokens.refreshToken) {
        const refreshTokenEncrypted = await encryptToken(tokens.refreshToken);
        updateData.refreshToken = refreshTokenEncrypted.encrypted;
        updateData.refreshTokenIv = refreshTokenEncrypted.iv;
      }

      await this.db
        .update(socialAccounts)
        .set(updateData)
        .where(eq(socialAccounts.id, existingAccount.id));

      const [user] = await this.db
        .select()
        .from(authIdentity)
        .where(eq(authIdentity.id, existingAccount.userId))
        .limit(1);

      return { user, isNewUser: false };
    }

    // Check if user exists with this email
    const [existingUser] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.email, profile.email))
      .limit(1);

    if (existingUser) {
      // Link social account to existing user
      await this.storeConnection(existingUser.id, provider, profile, tokens);
      return { user: existingUser, isNewUser: false };
    }

    // Create new user with social account in a transaction
    let newUser: typeof authIdentity.$inferSelect;
    await this.db.transaction(async (tx) => {
      const [identity] = await tx
        .insert(authIdentity)
        .values({
          email: profile.email,
          emailVerified: new Date().toISOString(), // OAuth providers verify email
        })
        .returning();

      newUser = identity;

      // Encrypt tokens before storing
      const accessTokenEncrypted = await encryptToken(tokens.accessToken);
      const insertData: Record<string, unknown> = {
        id: createId(),
        userId: identity.id,
        provider,
        providerUserId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        username: profile.username ?? null,
        accessToken: accessTokenEncrypted.encrypted,
        accessTokenIv: accessTokenEncrypted.iv,
        tokenExpiresAt: tokens.expiresAt?.toISOString() ?? null,
        scopes: tokens.scopes?.join(' ') ?? null,
        metadata: profile.raw ? JSON.stringify(profile.raw) : '{}',
        lastSyncedAt: new Date().toISOString(),
      };

      if (tokens.refreshToken) {
        const refreshTokenEncrypted = await encryptToken(tokens.refreshToken);
        insertData.refreshToken = refreshTokenEncrypted.encrypted;
        insertData.refreshTokenIv = refreshTokenEncrypted.iv;
      }

      await tx.insert(socialAccounts).values(insertData as any);

      // Emit IdentityCreatedEvent for downstream listeners (e.g., profile creation)
      await this.events.dispatch(
        new IdentityCreatedEvent({
          identityId: identity.id,
          email: identity.email,
          initialName: profile.displayName || undefined,
        }),
      );
    });

    return { user: newUser!, isNewUser: true };
  }

  /**
   * Link a social account to an existing user.
   */
  private async linkToUser(
    userId: string,
    profile: OAuthUserProfile,
    tokens: OAuthTokens,
    provider: string,
  ): Promise<void> {
    // Check if this provider account is already linked to another user
    const [existingAccount] = await this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerUserId, profile.providerId),
        ),
      )
      .limit(1);

    if (existingAccount) {
      if (existingAccount.userId === userId) {
        // Already linked to this user -- update tokens
        const accessTokenEncrypted = await encryptToken(tokens.accessToken);
        const updateData: Record<string, unknown> = {
          accessToken: accessTokenEncrypted.encrypted,
          accessTokenIv: accessTokenEncrypted.iv,
          tokenExpiresAt: tokens.expiresAt?.toISOString() ?? null,
          scopes: tokens.scopes?.join(' ') ?? null,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (tokens.refreshToken) {
          const refreshTokenEncrypted = await encryptToken(tokens.refreshToken);
          updateData.refreshToken = refreshTokenEncrypted.encrypted;
          updateData.refreshTokenIv = refreshTokenEncrypted.iv;
        }

        await this.db
          .update(socialAccounts)
          .set(updateData)
          .where(eq(socialAccounts.id, existingAccount.id));
        return;
      }
      throw new Error(
        'This social account is already linked to another user',
      );
    }

    // Check if user already has this provider connected
    const [existingUserProvider] = await this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.provider, provider),
        ),
      )
      .limit(1);

    if (existingUserProvider) {
      throw new Error(
        `User already has a ${provider} account connected`,
      );
    }

    await this.storeConnection(userId, provider, profile, tokens);
  }

  /**
   * Store a social connection in the database with encrypted tokens.
   */
  private async storeConnection(
    userId: string,
    provider: string,
    profile: OAuthUserProfile,
    tokens: OAuthTokens,
  ): Promise<void> {
    const accessTokenEncrypted = await encryptToken(tokens.accessToken);
    const insertData: Record<string, unknown> = {
      id: createId(),
      userId,
      provider,
      providerUserId: profile.providerId,
      email: profile.email,
      displayName: profile.displayName ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      username: profile.username ?? null,
      accessToken: accessTokenEncrypted.encrypted,
      accessTokenIv: accessTokenEncrypted.iv,
      tokenExpiresAt: tokens.expiresAt?.toISOString() ?? null,
      scopes: tokens.scopes?.join(' ') ?? null,
      metadata: profile.raw ? JSON.stringify(profile.raw) : '{}',
      lastSyncedAt: new Date().toISOString(),
    };

    if (tokens.refreshToken) {
      const refreshTokenEncrypted = await encryptToken(tokens.refreshToken);
      insertData.refreshToken = refreshTokenEncrypted.encrypted;
      insertData.refreshTokenIv = refreshTokenEncrypted.iv;
    }

    await this.db.insert(socialAccounts).values(insertData as any);
  }
}
