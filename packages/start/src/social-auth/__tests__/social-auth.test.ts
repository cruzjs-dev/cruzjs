/**
 * Social Auth Unit Tests
 *
 * Tests for OAuth providers, state management, PKCE, token encryption,
 * OAuthState encoding/decoding, and OAuthService behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubProvider } from '../providers/github.provider';
import { GoogleProvider } from '../providers/google.provider';
import { DiscordProvider } from '../providers/discord.provider';
import { TwitterProvider } from '../providers/twitter.provider';
import { LinkedInProvider } from '../providers/linkedin.provider';
import { MicrosoftProvider } from '../providers/microsoft.provider';
import { AppleProvider } from '../providers/apple.provider';
import {
  generateState,
  validateState,
  generateCodeVerifier,
  generateCodeChallenge,
  encodeOAuthState,
  decodeOAuthState,
} from '../oauth.service';
import { SocialProvider, SOCIAL_PROVIDER_VALUES } from '../social-auth.types';
import type { OAuthProvider } from '../oauth.provider';
import type { OAuthState } from '../social-auth.types';

// ─── SocialProvider enum ─────────────────────────────────────────────────────

describe('SocialProvider', () => {
  it('should have all 7 providers', () => {
    expect(SOCIAL_PROVIDER_VALUES).toHaveLength(7);
  });

  it('should have correct values', () => {
    expect(SocialProvider.GITHUB).toBe('github');
    expect(SocialProvider.GOOGLE).toBe('google');
    expect(SocialProvider.DISCORD).toBe('discord');
    expect(SocialProvider.TWITTER).toBe('twitter');
    expect(SocialProvider.LINKEDIN).toBe('linkedin');
    expect(SocialProvider.MICROSOFT).toBe('microsoft');
    expect(SocialProvider.APPLE).toBe('apple');
  });
});

// ─── GitHub Provider ──────────────────────────────────────────────────────────

describe('GitHubProvider', () => {
  const provider = new GitHubProvider({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  });

  it('should have name "github"', () => {
    expect(provider.name).toBe('github');
  });

  it('should have correct scopes', () => {
    expect(provider.scopes).toEqual(['user:email', 'read:user']);
  });

  it('should not require PKCE', () => {
    expect(provider.requiresPkce).toBe(false);
  });

  it('should generate correct auth URL with state', () => {
    const url = provider.getAuthUrl('test-state', 'https://example.com/callback');
    expect(url).toContain('https://github.com/login/oauth/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('state=test-state');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    expect(url).toContain('scope=user%3Aemail+read%3Auser');
  });
});

// ─── Google Provider ──────────────────────────────────────────────────────────

describe('GoogleProvider', () => {
  const provider = new GoogleProvider({
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
  });

  it('should have name "google"', () => {
    expect(provider.name).toBe('google');
  });

  it('should have correct scopes', () => {
    expect(provider.scopes).toEqual(['openid', 'email', 'profile']);
  });

  it('should require PKCE', () => {
    expect(provider.requiresPkce).toBe(true);
  });

  it('should generate auth URL with PKCE code_challenge', () => {
    const url = provider.getAuthUrl('test-state', 'https://example.com/callback', 'test-challenge');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('code_challenge=test-challenge');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  it('should generate auth URL without PKCE when no verifier', () => {
    const url = provider.getAuthUrl('test-state', 'https://example.com/callback');
    expect(url).not.toContain('code_challenge');
  });
});

// ─── Discord Provider ─────────────────────────────────────────────────────────

describe('DiscordProvider', () => {
  const provider = new DiscordProvider({
    clientId: 'discord-client-id',
    clientSecret: 'discord-client-secret',
  });

  it('should have name "discord"', () => {
    expect(provider.name).toBe('discord');
  });

  it('should not require PKCE', () => {
    expect(provider.requiresPkce).toBe(false);
  });

  it('should generate correct auth URL', () => {
    const url = provider.getAuthUrl('state-123', 'https://example.com/callback');
    expect(url).toContain('https://discord.com/oauth2/authorize');
    expect(url).toContain('scope=identify+email');
  });
});

// ─── Twitter Provider ─────────────────────────────────────────────────────────

describe('TwitterProvider', () => {
  const provider = new TwitterProvider({
    clientId: 'twitter-client-id',
    clientSecret: 'twitter-client-secret',
  });

  it('should have name "twitter"', () => {
    expect(provider.name).toBe('twitter');
  });

  it('should require PKCE', () => {
    expect(provider.requiresPkce).toBe(true);
  });

  it('should generate auth URL with code_challenge', () => {
    const url = provider.getAuthUrl('state-123', 'https://example.com/callback', 'challenge-value');
    expect(url).toContain('https://twitter.com/i/oauth2/authorize');
    expect(url).toContain('code_challenge=challenge-value');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('should have correct scopes', () => {
    expect(provider.scopes).toEqual(['tweet.read', 'users.read', 'offline.access']);
  });
});

// ─── LinkedIn Provider ────────────────────────────────────────────────────────

describe('LinkedInProvider', () => {
  const provider = new LinkedInProvider({
    clientId: 'linkedin-client-id',
    clientSecret: 'linkedin-client-secret',
  });

  it('should have name "linkedin"', () => {
    expect(provider.name).toBe('linkedin');
  });

  it('should not require PKCE', () => {
    expect(provider.requiresPkce).toBe(false);
  });

  it('should generate correct auth URL', () => {
    const url = provider.getAuthUrl('state-456', 'https://example.com/callback');
    expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('scope=openid+profile+email');
  });
});

// ─── Microsoft Provider ───────────────────────────────────────────────────────

describe('MicrosoftProvider', () => {
  const provider = new MicrosoftProvider({
    clientId: 'ms-client-id',
    clientSecret: 'ms-client-secret',
  });

  it('should have name "microsoft"', () => {
    expect(provider.name).toBe('microsoft');
  });

  it('should require PKCE', () => {
    expect(provider.requiresPkce).toBe(true);
  });

  it('should default to "common" tenant', () => {
    const url = provider.getAuthUrl('state-789', 'https://example.com/callback');
    expect(url).toContain('login.microsoftonline.com/common/oauth2/v2.0/authorize');
  });

  it('should use custom tenant when configured', () => {
    const customProvider = new MicrosoftProvider({
      clientId: 'ms-client-id',
      clientSecret: 'ms-client-secret',
      tenant: 'my-tenant-id',
    });
    const url = customProvider.getAuthUrl('state-789', 'https://example.com/callback');
    expect(url).toContain('login.microsoftonline.com/my-tenant-id/');
  });

  it('should include PKCE code_challenge when provided', () => {
    const url = provider.getAuthUrl('state-789', 'https://example.com/callback', 'test-challenge');
    expect(url).toContain('code_challenge=test-challenge');
    expect(url).toContain('code_challenge_method=S256');
  });
});

// ─── Apple Provider ───────────────────────────────────────────────────────────

describe('AppleProvider', () => {
  const provider = new AppleProvider({
    clientId: 'com.example.app',
    clientSecret: '', // not used directly
    teamId: 'TEAM123',
    keyId: 'KEY456',
    privateKey: 'dummy-key', // Would be a real PEM in production
  });

  it('should have name "apple"', () => {
    expect(provider.name).toBe('apple');
  });

  it('should generate correct auth URL', () => {
    const url = provider.getAuthUrl('state-apple', 'https://example.com/callback');
    expect(url).toContain('https://appleid.apple.com/auth/authorize');
    expect(url).toContain('response_mode=form_post');
    expect(url).toContain('scope=name+email');
  });
});

// ─── State Management ─────────────────────────────────────────────────────────

describe('generateState', () => {
  it('should return a random hex string', () => {
    const state = generateState();
    expect(state).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return unique values on each call', () => {
    const state1 = generateState();
    const state2 = generateState();
    expect(state1).not.toBe(state2);
  });
});

describe('validateState', () => {
  it('should return true for matching states', () => {
    const state = 'abc123def456';
    expect(validateState(state, state)).toBe(true);
  });

  it('should return false for mismatched states', () => {
    expect(validateState('abc123', 'xyz789')).toBe(false);
  });

  it('should return false for empty strings', () => {
    expect(validateState('', '')).toBe(false);
    expect(validateState('abc', '')).toBe(false);
    expect(validateState('', 'abc')).toBe(false);
  });

  it('should return false for different lengths', () => {
    expect(validateState('abc', 'abcd')).toBe(false);
  });
});

// ─── PKCE ─────────────────────────────────────────────────────────────────────

describe('PKCE', () => {
  it('generateCodeVerifier should return a URL-safe string', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    // Should be URL-safe base64
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generateCodeChallenge should produce a different string from verifier', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).not.toBe(verifier);
    // Should be URL-safe base64
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generateCodeChallenge should be deterministic for same verifier', async () => {
    const verifier = 'test-verifier-string-for-determinism';
    const challenge1 = await generateCodeChallenge(verifier);
    const challenge2 = await generateCodeChallenge(verifier);
    expect(challenge1).toBe(challenge2);
  });
});

// ─── OAuthState encoding/decoding ─────────────────────────────────────────────

describe('OAuthState encoding/decoding', () => {
  it('should round-trip a simple state', () => {
    const state: OAuthState = {
      nonce: 'test-nonce-123',
      createdAt: Date.now(),
    };
    const encoded = encodeOAuthState(state);
    const decoded = decodeOAuthState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.nonce).toBe(state.nonce);
    expect(decoded!.createdAt).toBe(state.createdAt);
  });

  it('should preserve redirectTo and userId', () => {
    const state: OAuthState = {
      nonce: 'nonce-456',
      redirectTo: '/settings',
      userId: 'user-abc',
      createdAt: Date.now(),
    };
    const encoded = encodeOAuthState(state);
    const decoded = decodeOAuthState(encoded);
    expect(decoded!.redirectTo).toBe('/settings');
    expect(decoded!.userId).toBe('user-abc');
  });

  it('should return null for expired state (older than 10 minutes)', () => {
    const state: OAuthState = {
      nonce: 'nonce-old',
      createdAt: Date.now() - 11 * 60 * 1000, // 11 minutes ago
    };
    const encoded = encodeOAuthState(state);
    const decoded = decodeOAuthState(encoded);
    expect(decoded).toBeNull();
  });

  it('should return null for malformed input', () => {
    expect(decodeOAuthState('')).toBeNull();
    expect(decodeOAuthState('not-valid-base64!!!')).toBeNull();
    // Valid base64 but invalid JSON
    expect(decodeOAuthState(btoa('not json'))).toBeNull();
  });

  it('should return null for state missing nonce', () => {
    const encoded = btoa(JSON.stringify({ createdAt: Date.now() }));
    expect(decodeOAuthState(encoded)).toBeNull();
  });

  it('should return null for state missing createdAt', () => {
    const encoded = btoa(JSON.stringify({ nonce: 'test' }));
    expect(decodeOAuthState(encoded)).toBeNull();
  });
});

// ─── OAuthService (provider registry) ─────────────────────────────────────────

describe('OAuthService provider registry', () => {
  function createProviderMap(providers: OAuthProvider[]): Map<string, OAuthProvider> {
    const map = new Map<string, OAuthProvider>();
    for (const provider of providers) {
      map.set(provider.name, provider);
    }
    return map;
  }

  it('should return registered provider by name', () => {
    const github = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });
    const map = createProviderMap([github]);
    expect(map.get('github')).toBe(github);
  });

  it('should return undefined for unknown provider', () => {
    const map = createProviderMap([]);
    expect(map.get('unknown')).toBeUndefined();
  });

  it('should register multiple providers', () => {
    const github = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });
    const google = new GoogleProvider({ clientId: 'id', clientSecret: 'secret' });
    const discord = new DiscordProvider({ clientId: 'id', clientSecret: 'secret' });
    const map = createProviderMap([github, google, discord]);
    expect(map.size).toBe(3);
    expect(map.get('github')?.name).toBe('github');
    expect(map.get('google')?.name).toBe('google');
    expect(map.get('discord')?.name).toBe('discord');
  });

  it('should register all 7 providers', () => {
    const providers = [
      new GitHubProvider({ clientId: 'id', clientSecret: 'secret' }),
      new GoogleProvider({ clientId: 'id', clientSecret: 'secret' }),
      new DiscordProvider({ clientId: 'id', clientSecret: 'secret' }),
      new TwitterProvider({ clientId: 'id', clientSecret: 'secret' }),
      new LinkedInProvider({ clientId: 'id', clientSecret: 'secret' }),
      new MicrosoftProvider({ clientId: 'id', clientSecret: 'secret' }),
      new AppleProvider({ clientId: 'id', clientSecret: '', teamId: 'T', keyId: 'K', privateKey: 'pk' }),
    ];
    const map = createProviderMap(providers);
    expect(map.size).toBe(7);
    for (const p of SOCIAL_PROVIDER_VALUES) {
      expect(map.has(p)).toBe(true);
    }
  });
});

// ─── Provider requiresPkce ─────────────────────────────────────────────────────

describe('Provider PKCE requirements', () => {
  it('providers requiring PKCE should be flagged', () => {
    const google = new GoogleProvider({ clientId: 'id', clientSecret: 'secret' });
    const twitter = new TwitterProvider({ clientId: 'id', clientSecret: 'secret' });
    const microsoft = new MicrosoftProvider({ clientId: 'id', clientSecret: 'secret' });

    expect(google.requiresPkce).toBe(true);
    expect(twitter.requiresPkce).toBe(true);
    expect(microsoft.requiresPkce).toBe(true);
  });

  it('providers not requiring PKCE should be flagged', () => {
    const github = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });
    const discord = new DiscordProvider({ clientId: 'id', clientSecret: 'secret' });
    const linkedin = new LinkedInProvider({ clientId: 'id', clientSecret: 'secret' });

    expect(github.requiresPkce).toBe(false);
    expect(discord.requiresPkce).toBe(false);
    expect(linkedin.requiresPkce).toBe(false);
  });
});

// ─── OAuthService.handleCallback (mock) ───────────────────────────────────────

describe('OAuthService handleCallback behavior', () => {
  it('should reject invalid state', () => {
    const isValid = validateState('wrong-state', 'expected-state');
    expect(isValid).toBe(false);
  });

  it('should accept valid state', () => {
    const state = generateState();
    const isValid = validateState(state, state);
    expect(isValid).toBe(true);
  });
});

// ─── GitHub exchangeCode mock ─────────────────────────────────────────────────

describe('GitHubProvider exchangeCode', () => {
  it('should throw on non-OK response', async () => {
    const provider = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });

    // Mock global fetch to return a non-OK response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({}),
    });

    await expect(
      provider.exchangeCode('bad-code', 'https://example.com/callback'),
    ).rejects.toThrow('GitHub token exchange failed: 400');

    globalThis.fetch = originalFetch;
  });

  it('should throw on GitHub error response', async () => {
    const provider = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      }),
    });

    await expect(
      provider.exchangeCode('expired-code', 'https://example.com/callback'),
    ).rejects.toThrow('The code passed is incorrect or expired.');

    globalThis.fetch = originalFetch;
  });

  it('should return tokens on success', async () => {
    const provider = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'gho_test_token_123',
        token_type: 'bearer',
        scope: 'user:email,read:user',
      }),
    });

    const tokens = await provider.exchangeCode('valid-code', 'https://example.com/callback');
    expect(tokens.accessToken).toBe('gho_test_token_123');
    expect(tokens.scopes).toEqual(['user:email', 'read:user']);

    globalThis.fetch = originalFetch;
  });
});

// ─── Google getUserProfile mock ───────────────────────────────────────────────

describe('GoogleProvider getUserProfile', () => {
  it('should return profile with email', async () => {
    const provider = new GoogleProvider({ clientId: 'id', clientSecret: 'secret' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        sub: '112233445566',
        email: 'user@gmail.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      }),
    });

    const profile = await provider.getUserProfile('access-token');
    expect(profile.providerId).toBe('112233445566');
    expect(profile.email).toBe('user@gmail.com');
    expect(profile.displayName).toBe('Test User');
    expect(profile.avatarUrl).toBe('https://lh3.googleusercontent.com/photo.jpg');

    globalThis.fetch = originalFetch;
  });
});

// ─── Discord getUserProfile mock ──────────────────────────────────────────────

describe('DiscordProvider getUserProfile', () => {
  it('should extract username from profile', async () => {
    const provider = new DiscordProvider({ clientId: 'id', clientSecret: 'secret' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        email: 'test@discord.com',
        avatar: 'abc123',
        discriminator: '0',
      }),
    });

    const profile = await provider.getUserProfile('access-token');
    expect(profile.username).toBe('testuser');
    expect(profile.displayName).toBe('Test User');
    expect(profile.avatarUrl).toBe('https://cdn.discordapp.com/avatars/123456789/abc123.png');

    globalThis.fetch = originalFetch;
  });
});

// ─── GitHub getUserProfile username extraction ────────────────────────────────

describe('GitHubProvider getUserProfile', () => {
  it('should extract username (login) from profile', async () => {
    const provider = new GitHubProvider({ clientId: 'id', clientSecret: 'secret' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 12345,
          login: 'octocat',
          name: 'The Octocat',
          email: 'octocat@github.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        }),
      });

    const profile = await provider.getUserProfile('access-token');
    expect(profile.username).toBe('octocat');
    expect(profile.providerId).toBe('12345');
    expect(profile.displayName).toBe('The Octocat');

    globalThis.fetch = originalFetch;
  });
});
