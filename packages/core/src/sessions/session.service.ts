/**
 * Session Service
 *
 * Central service for managing user sessions: creation, validation,
 * revocation, touch updates, pruning, and concurrent session limits.
 *
 * Uses the Web Crypto API (crypto.subtle) for SHA-256 hashing,
 * which works across Cloudflare Workers, Node.js, and all modern runtimes.
 */

import { Injectable, Inject, Optional } from '../di';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import { ConfigService } from '../shared/config/config.service';
import type { SessionAdapter } from './session.adapter';
import type { SessionData, CreateSessionInput, SessionConfig } from './session.types';
import { SESSION_ADAPTER, DEFAULT_SESSION_CONFIG } from './session.types';
import { DatabaseSessionAdapter } from './adapters/database.session.adapter';
import { parseDeviceLabel } from './session.fingerprint';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class SessionService {
  private readonly adapter: SessionAdapter;
  private readonly sessionConfig: SessionConfig;

  constructor(
    @Inject(SESSION_ADAPTER) @Optional() adapter: SessionAdapter | undefined,
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    // Fall back to DatabaseSessionAdapter if no platform-specific adapter is injected
    this.adapter = adapter ?? new DatabaseSessionAdapter(db);

    this.sessionConfig = {
      maxSessionsPerUser: this.config.get<number>('SESSION_MAX_PER_USER', DEFAULT_SESSION_CONFIG.maxSessionsPerUser) ?? DEFAULT_SESSION_CONFIG.maxSessionsPerUser,
      sessionTtlSeconds: this.config.get<number>('SESSION_TTL_SECONDS', DEFAULT_SESSION_CONFIG.sessionTtlSeconds) ?? DEFAULT_SESSION_CONFIG.sessionTtlSeconds,
      touchIntervalSeconds: this.config.get<number>('SESSION_TOUCH_INTERVAL_SECONDS', DEFAULT_SESSION_CONFIG.touchIntervalSeconds) ?? DEFAULT_SESSION_CONFIG.touchIntervalSeconds,
    };
  }

  /**
   * Create a new session for a user.
   * Returns the session data and the raw token (which should be sent to the client).
   */
  async create(input: CreateSessionInput): Promise<{ session: SessionData; token: string }> {
    const token = this.generateToken();
    const tokenHash = await this.hashToken(token);
    const now = new Date();
    const expiresIn = input.expiresIn ?? this.sessionConfig.sessionTtlSeconds;

    const session: SessionData = {
      id: createId(),
      userId: input.userId,
      token, // Raw token, returned to caller but never persisted
      tokenHash,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      deviceFingerprint: input.deviceFingerprint ?? null,
      deviceLabel: this.parseDeviceLabel(input.userAgent ?? null),
      lastActiveAt: now,
      expiresAt: new Date(now.getTime() + expiresIn * 1000),
      revokedAt: null,
      metadata: input.metadata ?? {},
      createdAt: now,
    };

    // Enforce concurrent session limit before storing the new session
    await this.enforceSessionLimit(input.userId);

    await this.adapter.store(session);

    return { session, token };
  }

  /**
   * Validate a session token.
   * Returns the session if valid, null if expired, revoked, or not found.
   */
  async validate(token: string): Promise<SessionData | null> {
    const tokenHash = await this.hashToken(token);
    const session = await this.adapter.retrieve(tokenHash);

    if (!session) {
      return null;
    }

    // Check if revoked
    if (session.revokedAt !== null) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  /** Revoke a single session by ID */
  async revoke(sessionId: string): Promise<void> {
    await this.adapter.revoke(sessionId);
  }

  /** Revoke all sessions for a user */
  async revokeAll(userId: string): Promise<void> {
    await this.adapter.revokeAll(userId);
  }

  /**
   * List all active (non-expired, non-revoked) sessions for a user.
   */
  async listActive(userId: string): Promise<SessionData[]> {
    const allSessions = await this.adapter.listByUser(userId);
    const now = new Date();

    return allSessions.filter(
      (s) => s.revokedAt === null && s.expiresAt > now,
    );
  }

  /**
   * Touch a session to update its last active timestamp.
   * Skips update if the session was touched within the configured interval.
   */
  async touch(sessionId: string): Promise<void> {
    const session = await this.adapter.retrieveById(sessionId);
    if (!session) {
      return;
    }

    const now = new Date();
    const elapsedSeconds = (now.getTime() - session.lastActiveAt.getTime()) / 1000;

    if (elapsedSeconds >= this.sessionConfig.touchIntervalSeconds) {
      await this.adapter.touch(sessionId, now);
    }
  }

  /** Remove expired and revoked sessions from storage */
  async prune(): Promise<number> {
    return this.adapter.prune();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** Hash a raw token using SHA-256 (Web Crypto API) */
  async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Generate a cryptographically secure random token */
  private generateToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Parse user agent into a human-readable device label */
  private parseDeviceLabel(userAgent: string | null): string | null {
    if (!userAgent) return null;
    return parseDeviceLabel(userAgent);
  }

  /**
   * Enforce the concurrent session limit for a user.
   * If the user has too many active sessions, the oldest ones are revoked.
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.listActive(userId);

    if (activeSessions.length >= this.sessionConfig.maxSessionsPerUser) {
      // Sort by createdAt ascending (oldest first)
      const sorted = [...activeSessions].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      // Revoke the oldest sessions to make room for the new one
      const sessionsToRevoke = sorted.slice(
        0,
        activeSessions.length - this.sessionConfig.maxSessionsPerUser + 1,
      );

      await Promise.all(
        sessionsToRevoke.map((s) => this.adapter.revoke(s.id)),
      );
    }
  }
}
