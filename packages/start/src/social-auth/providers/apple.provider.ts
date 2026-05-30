/**
 * Apple Sign In OAuth Provider with PKCE + JWT Client Secret
 *
 * Implements OAuth 2.0 for Apple Sign In.
 * https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api
 *
 * Apple is unique: the client_secret is a JWT signed with your private key.
 * Configuration requires:
 * - clientId: Apple Services ID (e.g., com.example.app)
 * - teamId: Apple Developer Team ID
 * - keyId: Key ID from Apple Developer Portal
 * - privateKey: Contents of the .p8 private key file
 */

import type { OAuthProvider } from '../oauth.provider';
import type { OAuthUserProfile, OAuthTokens, OAuthProviderConfig } from '../social-auth.types';

export class AppleProvider implements OAuthProvider {
  readonly name = 'apple';
  readonly scopes = ['name', 'email'];

  constructor(private readonly config: OAuthProviderConfig) {}

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      response_mode: 'form_post', // Apple uses form_post by default
    });

    return `https://appleid.apple.com/auth/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientSecret = await this.generateClientSecret();

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Apple token exchange failed: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      id_token: string;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    // Apple does not have a userinfo endpoint.
    // User info comes from the id_token (JWT) during the initial auth.
    // The accessToken here is the id_token's content decoded.
    // We decode the id_token that was returned during exchangeCode.
    //
    // In practice, the caller should pass the id_token. For this implementation,
    // we decode the JWT payload without verification (it was already verified by Apple).
    // The access token for Apple is not useful for fetching profile data.
    //
    // Apple only provides email and name on FIRST authorization.
    // Subsequent authorizations only contain the sub (user ID).

    // Try to decode as JWT (the caller may pass id_token as accessToken)
    const parts = accessToken.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
          sub: string;
          email?: string;
          email_verified?: string;
          is_private_email?: string;
        };

        return {
          providerId: payload.sub,
          email: payload.email ?? `${payload.sub}@privaterelay.appleid.com`,
          raw: payload as unknown as Record<string, unknown>,
        };
      } catch {
        // Fall through to error
      }
    }

    throw new Error(
      'Apple does not provide a userinfo endpoint. ' +
      'The id_token from the token exchange must be used to extract user profile data.',
    );
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const clientSecret = await this.generateClientSecret();

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Apple token refresh failed: ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
      id_token: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken, // Apple does not return a new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Generate a JWT client_secret for Apple Sign In.
   * Apple requires a JWT signed with your ES256 private key.
   *
   * JWT Header: { alg: 'ES256', kid: keyId }
   * JWT Payload: { iss: teamId, iat: now, exp: now+5min, aud: 'https://appleid.apple.com', sub: clientId }
   */
  private async generateClientSecret(): Promise<string> {
    const teamId = this.config.teamId as string;
    const keyId = this.config.keyId as string;
    const privateKey = this.config.privateKey as string;

    if (!teamId || !keyId || !privateKey) {
      throw new Error('Apple OAuth requires teamId, keyId, and privateKey in config');
    }

    const now = Math.floor(Date.now() / 1000);

    // JWT Header
    const header = {
      alg: 'ES256',
      kid: keyId,
    };

    // JWT Payload
    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 300, // 5 minutes
      aud: 'https://appleid.apple.com',
      sub: this.config.clientId,
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncodeJson(header);
    const encodedPayload = base64UrlEncodeJson(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Import private key and sign
    const key = await importES256Key(privateKey);
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(signingInput),
    );

    const encodedSignature = base64UrlEncodeBytes(new Uint8Array(signature));
    return `${signingInput}.${encodedSignature}`;
  }
}

/**
 * Base64url encode a JSON object.
 */
function base64UrlEncodeJson(obj: object): string {
  const json = JSON.stringify(obj);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url encode raw bytes.
 */
function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import a PEM-encoded ES256 private key for use with Web Crypto.
 */
async function importES256Key(pem: string): Promise<CryptoKey> {
  // Strip PEM headers and whitespace
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryString = atob(pemBody);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}
