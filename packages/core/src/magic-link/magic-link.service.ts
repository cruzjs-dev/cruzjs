/**
 * Magic Link Service
 *
 * Generates, sends, verifies, and cleans up magic link tokens for
 * passwordless authentication. Uses Web Crypto API for Cloudflare Workers
 * compatibility.
 */

import { injectable, inject } from 'inversify';
import { eq, and, lt, isNotNull, count, gte } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { ConfigService } from '../shared/config/config.service';
import { EmailService } from '../email/email.service';
import { magicLinks } from './magic-link.schema';
import { authIdentity } from '../database/schema';
import { buildMagicLinkEmail } from './magic-link.email';
import type {
  RequestMagicLinkInput,
  VerifyMagicLinkResult,
  MagicLinkConfig,
} from './magic-link.types';
import { DEFAULT_MAGIC_LINK_CONFIG } from './magic-link.types';

@injectable()
export class MagicLinkService {
  private readonly config: MagicLinkConfig;

  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(EmailService) private readonly email: EmailService,
    @inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.config = { ...DEFAULT_MAGIC_LINK_CONFIG };
  }

  /**
   * Generate and send a magic link to the given email address.
   * Silently succeeds even if rate limited (to avoid email enumeration).
   */
  async request(input: RequestMagicLinkInput): Promise<void> {
    const email = input.email.toLowerCase().trim();

    // Rate limit check
    const recentCount = await this.getRateLimitCount(email);
    if (recentCount >= this.config.maxRequestsPerHour) {
      // Silently return to prevent email enumeration
      return;
    }

    // Look up existing user
    const [existingUser] = await this.db
      .select({ id: authIdentity.id })
      .from(authIdentity)
      .where(eq(authIdentity.email, email))
      .limit(1);

    const userId = existingUser?.id ?? null;

    // If no user and auto-register is off, silently return
    if (!userId && !this.config.autoRegister) {
      return;
    }

    // Generate token
    const { token, tokenHash } = await this.generateToken();

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + this.config.expiryMinutes * 60 * 1000,
    );

    // Store in database
    await this.db.insert(magicLinks).values({
      userId,
      email,
      tokenHash,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      redirectTo: input.redirectTo ?? null,
    });

    // Build URL and send email
    const magicLinkUrl = this.buildMagicLinkUrl(token, input.redirectTo);
    const appName = this.configService.get<string>('APP_NAME', 'App') ?? 'App';

    const emailContent = buildMagicLinkEmail({
      email,
      magicLinkUrl,
      expiryMinutes: this.config.expiryMinutes,
      appName,
    });

    await this.email.sendEmail(
      email,
      emailContent.subject,
      emailContent.html,
      emailContent.text,
      'magic-link',
    );
  }

  /**
   * Verify and consume a magic link token.
   * Returns user info if valid, or a failure reason.
   */
  async verify(token: string): Promise<VerifyMagicLinkResult> {
    const tokenHash = await this.hashToken(token);

    const [link] = await this.db
      .select()
      .from(magicLinks)
      .where(eq(magicLinks.tokenHash, tokenHash))
      .limit(1);

    if (!link) {
      return { success: false, reason: 'invalid' };
    }

    if (link.usedAt !== null) {
      return { success: false, reason: 'used' };
    }

    if (link.expiresAt < new Date()) {
      return { success: false, reason: 'expired' };
    }

    // Mark as used
    await this.db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, link.id));

    // Resolve or create user
    let userId = link.userId;
    let isNewUser = false;

    if (!userId && this.config.autoRegister) {
      // Create new user
      const [newUser] = await this.db
        .insert(authIdentity)
        .values({
          email: link.email,
          emailVerified: new Date().toISOString(),
        })
        .returning();

      userId = newUser.id;
      isNewUser = true;

      // Backfill userId on the magic link record
      await this.db
        .update(magicLinks)
        .set({ userId })
        .where(eq(magicLinks.id, link.id));
    }

    if (!userId) {
      return { success: false, reason: 'invalid' };
    }

    return {
      success: true,
      userId,
      email: link.email,
      isNewUser,
      redirectTo: link.redirectTo,
    };
  }

  /**
   * Check if a magic link token is valid without consuming it.
   */
  async peek(token: string): Promise<{ valid: boolean; email: string | null }> {
    const tokenHash = await this.hashToken(token);

    const [link] = await this.db
      .select()
      .from(magicLinks)
      .where(eq(magicLinks.tokenHash, tokenHash))
      .limit(1);

    if (!link || link.usedAt !== null || link.expiresAt < new Date()) {
      return { valid: false, email: null };
    }

    return { valid: true, email: link.email };
  }

  /**
   * Delete expired and used magic links.
   * Returns the number of rows deleted.
   */
  async cleanup(): Promise<number> {
    const now = new Date();

    // Delete expired links
    const expiredResult = await this.db
      .delete(magicLinks)
      .where(lt(magicLinks.expiresAt, now))
      .returning();

    // Delete used links older than 24 hours
    const usedCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const usedResult = await this.db
      .delete(magicLinks)
      .where(
        and(
          isNotNull(magicLinks.usedAt),
          lt(magicLinks.createdAt, usedCutoff),
        ),
      )
      .returning();

    return expiredResult.length + usedResult.length;
  }

  // ── Private helpers ─────────────────────────────────────────────────

  /**
   * Count magic link requests for an email in the last hour.
   */
  private async getRateLimitCount(email: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [result] = await this.db
      .select({ count: count() })
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.email, email),
          gte(magicLinks.createdAt, oneHourAgo),
        ),
      );

    return result?.count ?? 0;
  }

  /**
   * Generate a cryptographically secure token and its SHA-256 hash.
   * Uses Web Crypto API for Cloudflare Workers compatibility.
   */
  async generateToken(): Promise<{ token: string; tokenHash: string }> {
    const bytes = new Uint8Array(this.config.tokenByteLength);
    crypto.getRandomValues(bytes);

    // Encode as URL-safe base64
    const token = this.bytesToBase64Url(bytes);
    const tokenHash = await this.hashToken(token);

    return { token, tokenHash };
  }

  /**
   * Compute the SHA-256 hash of a token string.
   * Deterministic: same input always produces same output.
   * Uses Web Crypto API (crypto.subtle.digest).
   */
  async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return this.bytesToHex(hashArray);
  }

  /**
   * Build the full magic link URL with token.
   */
  private buildMagicLinkUrl(token: string, redirectTo?: string): string {
    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const url = new URL('/auth/magic-link/verify', appUrl);
    url.searchParams.set('token', token);
    if (redirectTo) {
      url.searchParams.set('redirectTo', redirectTo);
    }
    return url.toString();
  }

  /**
   * Convert bytes to URL-safe base64 (no padding).
   */
  private bytesToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Convert bytes to hex string.
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
