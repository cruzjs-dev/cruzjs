import { Injectable, Inject } from '../di';
import { OAuth2RequestError, generateState, generateCodeVerifier } from 'arctic';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { accounts, authIdentity } from '../database/schema';
import { orgMembers } from '../database/schema';
import { IdentityCreatedEvent } from './events/identity-created.event';
import { EventEmitterService } from '../shared/events/event-emitter.service.server';
import { eq, and } from 'drizzle-orm';
import { SessionService } from './session.service';
import { KVCacheServiceFactory, KVCacheService } from '../shared/cloudflare/kv-cache.service';
import { googleOAuth, facebookOAuth } from './oauth-providers';
import type {
  OAuthProvider,
  OAuthUser,
  OAuthCallbackResult,
} from './auth.models';

/**
 * OAuth service for handling OAuth provider authentication
 * Supports Google and Facebook OAuth 2.0 flows
 */
@Injectable()
export class OAuthService {
  private readonly cacheService: KVCacheService;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(EventEmitterService) private readonly events: EventEmitterService
  ) {
    this.cacheService = cacheFactory.create('oauth');
  }

  /**
   * Verify OAuth state parameter (CSRF protection)
   */
  private async verifyState(
    state: string
  ): Promise<{
    provider: OAuthProvider;
    redirectUri?: string;
    codeVerifier?: string;
  } | null> {
    const cached = await this.cacheService.get<{
      provider: OAuthProvider;
      redirectUri?: string;
      codeVerifier?: string;
      createdAt: number;
    }>(`oauth:state:${state}`);

    if (!cached) {
      return null;
    }

    // Delete state after use (one-time use)
    await this.cacheService.delete(`oauth:state:${state}`);

    return {
      provider: cached.provider,
      redirectUri: cached.redirectUri,
      codeVerifier: cached.codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens and get user info
   */
  private async exchangeCodeForUser(
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<
    OAuthUser & {
      tokens: {
        accessToken: string;
        refreshToken?: string;
        expiresAt?: number;
        idToken?: string;
      };
    }
  > {
    // Verify state first
    const stateData = await this.verifyState(state);
    if (!stateData) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Exchange code for tokens - handle each provider separately for type safety
    let tokens;
    if (provider === 'google') {
      if (!googleOAuth) {
        throw new Error('Google OAuth is not configured');
      }
      if (!stateData.codeVerifier) {
        throw new Error('Missing code verifier for Google OAuth');
      }
      tokens = await googleOAuth.validateAuthorizationCode(
        code,
        stateData.codeVerifier
      );
    } else {
      if (!facebookOAuth) {
        throw new Error('Facebook OAuth is not configured');
      }
      tokens = await facebookOAuth.validateAuthorizationCode(code);
    }

    // Get tokens from Arctic OAuth2Tokens object
    const accessToken = tokens.accessToken();
    const refreshToken = tokens.hasRefreshToken()
      ? tokens.refreshToken()
      : undefined;
    const expiresAt = tokens.accessTokenExpiresAt()
      ? Math.floor(tokens.accessTokenExpiresAt().getTime() / 1000)
      : undefined;
    const idToken = tokens.idToken();

    // Get user info from provider
    let userInfo: OAuthUser;

    if (provider === 'google') {
      // Google provides user info in id_token or via userinfo endpoint
      const response = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user info from Google');
      }

      const data = await response.json() as { sub: string; email: string; name?: string; picture?: string };
      userInfo = {
        providerId: data.sub,
        email: data.email,
        name: data.name,
        avatar: data.picture,
      };
    } else if (provider === 'facebook') {
      // Facebook Graph API
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,email,name,picture&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user info from Facebook');
      }

      const data = await response.json() as { id: string; email: string; name?: string; picture?: { data?: { url?: string } } };
      userInfo = {
        providerId: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture?.data?.url,
      };
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return {
      ...userInfo,
      tokens: {
        accessToken,
        refreshToken,
        expiresAt,
        idToken,
      },
    };
  }

  /**
   * Generate authorization URL with CSRF state protection
   */
  async generateAuthorizationUrl(
    provider: OAuthProvider,
    redirectUri?: string
  ): Promise<{ url: string; state: string }> {
    // Generate secure random state for CSRF protection
    const state = generateState();

    // For Google (PKCE), generate code verifier
    let codeVerifier: string | undefined;
    if (provider === 'google') {
      codeVerifier = generateCodeVerifier();
    }

    // Store state and code verifier in Redis with 10-minute expiry
    await this.cacheService.set(
      `oauth:state:${state}`,
      {
        provider,
        redirectUri,
        codeVerifier,
        createdAt: Date.now(),
      },
      10 * 60
    ); // 10 minutes

    // Generate authorization URL - handle each provider separately for type safety
    let url: URL;
    if (provider === 'google') {
      if (!googleOAuth) {
        throw new Error('Google OAuth is not configured');
      }
      if (!codeVerifier) {
        throw new Error('Code verifier required for Google OAuth');
      }
      url = googleOAuth.createAuthorizationURL(state, codeVerifier, [
        'openid',
        'email',
        'profile',
      ]);
    } else {
      if (!facebookOAuth) {
        throw new Error('Facebook OAuth is not configured');
      }
      url = facebookOAuth.createAuthorizationURL(state, [
        'email',
        'public_profile',
      ]);
    }

    return { url: url.toString(), state };
  }

  /**
   * Handle OAuth callback - create or link account and create session
   */
  async handleOAuthCallback(
    provider: OAuthProvider,
    code: string,
    state: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<OAuthCallbackResult> {
    try {
      // Exchange code for user info and tokens
      const { tokens, ...oauthUser } = await this.exchangeCodeForUser(
        provider,
        code,
        state
      );

      // Check if account already exists
      const [existingAccount] = await this.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, oauthUser.providerId)))
        .limit(1);

      let user: typeof authIdentity.$inferSelect | undefined;
      let accountLinked = false;

      if (existingAccount) {
        // Account exists - login identity
        const [foundIdentity] = await this.db
          .select()
          .from(authIdentity)
          .where(eq(authIdentity.id, existingAccount.userId))
          .limit(1);
        user = foundIdentity!;

        // Update tokens
        await this.db
          .update(accounts)
          .set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : null,
            idToken: tokens.idToken,
          })
          .where(eq(accounts.id, existingAccount.id));
      } else {
        // Check if identity exists with this email
        const [existingIdentity] = await this.db
          .select()
          .from(authIdentity)
          .where(eq(authIdentity.email, oauthUser.email))
          .limit(1);

        if (existingIdentity) {
          // Identity exists but account not linked - link account
          user = existingIdentity;
          accountLinked = true;

          // Create account linked to existing identity
          await this.db.insert(accounts).values({
            userId: existingIdentity.id,
            type: 'oauth',
            provider,
            providerAccountId: oauthUser.providerId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : null,
            idToken: tokens.idToken,
            tokenType: 'Bearer',
            scope:
              provider === 'google'
                ? 'openid email profile'
                : 'email public_profile',
          });
        } else {
          // New identity - create identity and account in transaction
          await this.db.transaction(async (tx) => {
            const [newIdentity] = await tx
              .insert(authIdentity)
              .values({
                email: oauthUser.email,
                emailVerified: new Date().toISOString(), // OAuth providers verify email
              })
              .returning();

            await tx.insert(accounts).values({
              userId: newIdentity.id,
              type: 'oauth',
              provider,
              providerAccountId: oauthUser.providerId,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : null,
              idToken: tokens.idToken,
              tokenType: 'Bearer',
              scope:
                provider === 'google'
                  ? 'openid email profile'
                  : 'email public_profile',
            });

            user = newIdentity;

            // Emit IdentityCreatedEvent - app listens to create UserProfile
            await this.events.dispatch(
              new IdentityCreatedEvent({
                identityId: newIdentity.id,
                email: newIdentity.email,
                initialName: oauthUser.name || undefined,
              })
            );
          });
        }
      }

      // After all branches, user should be set
      if (!user) {
        throw new Error('Failed to create or find user during OAuth flow');
      }

      // Get user's first organization (if any) to set as current
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
          name: null, // Profile data not in Core
          emailVerified: user.emailVerified,
        },
        session: {
          token: session.token,
          expiresAt: typeof session.expiresAt === 'string' ? session.expiresAt : session.expiresAt.toISOString(),
        },
        accountLinked,
      };
    } catch (error) {
      if (error instanceof OAuth2RequestError) {
        throw new Error(`OAuth error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<void> {
    // Verify state
    const stateData = await this.verifyState(state);
    if (!stateData || stateData.provider !== provider) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Exchange code for user info and tokens
    const { tokens, ...oauthUser } = await this.exchangeCodeForUser(
      provider,
      code,
      state
    );

    // Check if account already linked
    const [existingAccount] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, oauthUser.providerId)))
      .limit(1);

    if (existingAccount) {
      if (existingAccount.userId === userId) {
        // Already linked to this user - update tokens
        await this.db
          .update(accounts)
          .set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : null,
            idToken: tokens.idToken,
          })
          .where(eq(accounts.id, existingAccount.id));
        return;
      } else {
        throw new Error('This OAuth account is already linked to another user');
      }
    }

    // Create account linked to user
    await this.db.insert(accounts).values({
      userId,
      type: 'oauth',
      provider,
      providerAccountId: oauthUser.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : null,
      idToken: tokens.idToken,
      tokenType: 'Bearer',
      scope:
        provider === 'google' ? 'openid email profile' : 'email public_profile',
    });
  }

  /**
   * Refresh OAuth access token (for Google)
   */
  async refreshOAuthToken(
    userId: string,
    provider: OAuthProvider
  ): Promise<{ accessToken: string; expiresAt: number }> {
    if (provider !== 'google') {
      throw new Error('Token refresh only supported for Google');
    }

    const [account] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')))
      .limit(1);

    if (!account || !account.refreshToken) {
      throw new Error('No refresh token found for Google account');
    }

    if (!googleOAuth) {
      throw new Error('Google OAuth is not configured');
    }

    // Refresh token using Arctic (Google only)
    const tokens = await googleOAuth.refreshAccessToken(account.refreshToken);

    // Get tokens from Arctic OAuth2Tokens object
    const accessToken = tokens.accessToken();
    const refreshToken = tokens.hasRefreshToken()
      ? tokens.refreshToken()
      : account.refreshToken;
    const expiresAtDate = tokens.accessTokenExpiresAt();
    const expiresAtTimestamp = expiresAtDate
      ? Math.floor(expiresAtDate.getTime() / 1000)
      : null;
    const expiresAtISO = expiresAtDate ? expiresAtDate.toISOString() : null;

    // Update tokens in database (D1 uses ISO strings)
    await this.db
      .update(accounts)
      .set({
        accessToken,
        refreshToken,
        expiresAt: expiresAtISO,
      })
      .where(eq(accounts.id, account.id));

    return {
      accessToken,
      expiresAt: expiresAtTimestamp || 0,
    };
  }

  /**
   * Revoke OAuth account link
   */
  async revokeOAuthAccount(
    userId: string,
    provider: OAuthProvider
  ): Promise<void> {
    await this.db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)));
  }
}

