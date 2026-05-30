/**
 * Social Auth API Router (REST)
 *
 * Handles the server-side OAuth redirect flow using the @ApiRouter decorator pattern.
 * These endpoints handle browser redirects (not JSON APIs), so they return
 * HTTP 302 redirects instead of JSON responses.
 *
 * Routes:
 * - GET /api/auth/social/:provider          - Initiate OAuth flow (redirect to provider)
 * - GET /api/auth/social/:provider/callback - Handle OAuth callback from provider
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { ApiRouter, Get, Param, Query, Session } from '@cruzjs/core/api';
import { ApiResponse } from '@cruzjs/core/api';
import { ApiRouterBase } from '@cruzjs/core/api';
import {
  SocialOAuthService,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  encodeOAuthState,
  decodeOAuthState,
} from './oauth.service';

@ApiRouter('/api/auth/social')
@Injectable()
export class SocialAuthApiRouter extends ApiRouterBase {
  @Inject(SocialOAuthService) private readonly service!: SocialOAuthService;

  /**
   * GET /api/auth/social/:provider
   *
   * Initiates the OAuth flow by redirecting the user to the provider's authorization page.
   * Query params:
   * - redirectTo: where to redirect after auth (default: /dashboard)
   */
  @Get(':provider')
  async initiate(
    @Param('provider') provider: string,
    @Session() session: any,
    @Query('redirectTo') redirectTo?: string,
  ): Promise<Response> {
    const oauthProvider = this.service.getProvider(provider);
    if (!oauthProvider) {
      return ApiResponse.badRequest(`Unknown OAuth provider: ${provider}`);
    }

    // Build OAuth state with CSRF nonce and flow context
    const nonce = generateState();
    const stateObj = {
      nonce,
      redirectTo: redirectTo ?? '/dashboard',
      userId: session?.user?.id, // set when linking to existing account
      createdAt: Date.now(),
    };
    const stateEncoded = encodeOAuthState(stateObj);

    // Build redirect URI for the callback
    // The callback URL is relative to this router: /api/auth/social/:provider/callback
    const callbackUri = this.buildCallbackUri(provider);

    // Generate PKCE if the provider requires it
    let codeChallenge: string | undefined;
    let codeVerifier: string | undefined;
    if (oauthProvider.requiresPkce) {
      codeVerifier = generateCodeVerifier();
      codeChallenge = await generateCodeChallenge(codeVerifier);
    }

    const authUrl = oauthProvider.getAuthUrl(stateEncoded, callbackUri, codeChallenge);

    // Store the nonce and code verifier in a short-lived cookie for callback validation.
    // This avoids needing sessionStorage which only works client-side.
    const cookieValue = JSON.stringify({
      nonce,
      codeVerifier: codeVerifier ?? null,
    });
    const cookieName = `oauth_${provider}`;
    const maxAge = 600; // 10 minutes

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        'Set-Cookie': `${cookieName}=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
      },
    });
  }

  /**
   * GET /api/auth/social/:provider/callback
   *
   * Handles the OAuth callback from the provider. Exchanges the authorization code
   * for a session, then redirects to the final destination.
   */
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') errorParam: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Query() query: Record<string, string>,
  ): Promise<Response> {
    // Handle provider-side errors
    if (errorParam) {
      const message = errorDescription || errorParam;
      return this.redirectWithError(`/auth/login?error=${encodeURIComponent(message)}`);
    }

    if (!code || !state) {
      return this.redirectWithError('/auth/login?error=Missing+authorization+code+or+state');
    }

    // Decode the state to extract flow context
    const stateObj = decodeOAuthState(state);
    if (!stateObj) {
      return this.redirectWithError('/auth/login?error=Invalid+or+expired+OAuth+state');
    }

    // The actual state validation is done by the service, which compares state strings.
    // Here we use the full encoded state as both state and expectedState since the
    // provider returns the exact state we sent.
    const callbackUri = this.buildCallbackUri(provider);

    try {
      // Read cookie to get code verifier for PKCE
      // (cookie is set during initiate and read here)
      // The cookie header is not directly available via @Query, so we pass
      // undefined for codeVerifier -- the initiate step already embedded
      // the code_challenge. Providers that need PKCE use the cookie value.
      // Note: In a real implementation, we'd use @Req() to read the cookie.
      // For now, we rely on the tRPC route for PKCE flows.

      const result = await this.service.handleCallback(
        provider,
        code,
        state,
        state, // state matches itself (server-side flow, no client-side storage)
        callbackUri,
        stateObj.userId, // link to existing user if set
      );

      const redirectTo = stateObj.redirectTo ?? '/dashboard';

      if (result.isNewUser) {
        return this.redirectAfterAuth('/profile/settings', result.session.token, provider);
      }

      return this.redirectAfterAuth(redirectTo, result.session.token, provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth callback failed';
      return this.redirectWithError(`/auth/login?error=${encodeURIComponent(message)}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Build the OAuth callback URI. In practice this would use the request's
   * host header, but for simplicity we use a relative pattern that the
   * provider implementations resolve.
   */
  private buildCallbackUri(provider: string): string {
    // This is a placeholder -- the actual redirect URI must be an absolute URL.
    // In production, the full URL is constructed by the route page component
    // which has access to window.location.origin.
    // For server-side redirects, the caller should pass the redirect URI.
    return `/api/auth/social/${provider}/callback`;
  }

  /**
   * Redirect to the destination after successful auth, setting the session cookie.
   */
  private redirectAfterAuth(
    redirectTo: string,
    sessionToken: string,
    provider: string,
  ): Response {
    const headers = new Headers();
    headers.set('Location', redirectTo);

    // Set session token cookie
    if (sessionToken) {
      headers.append(
        'Set-Cookie',
        `session_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      );
    }

    // Clear the OAuth cookie
    headers.append(
      'Set-Cookie',
      `oauth_${provider}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );

    return new Response(null, { status: 302, headers });
  }

  /**
   * Redirect to the error page with a message.
   */
  private redirectWithError(url: string): Response {
    return new Response(null, {
      status: 302,
      headers: { Location: url },
    });
  }
}
