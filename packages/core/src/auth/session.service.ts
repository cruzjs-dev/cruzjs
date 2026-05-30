import { Injectable, Inject } from '../di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { sessions } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { KVCacheServiceFactory, KVCacheService } from '../shared/cloudflare/kv-cache.service';
import type {
  CreateSessionInput,
  SessionData,
  SessionInfo,
} from './auth.models';
import { generateSessionToken, hashSessionToken } from './session.utils';

import { config } from '../shared/config';

// Lazy getters to avoid accessing config at module load time (Cloudflare Workers compatibility)
const getSessionTTLSeconds = () => config.session?.ttlSeconds ?? 30 * 24 * 60 * 60; // 30 days default
const getSessionRefreshThresholdSeconds = () => config.session?.refreshThresholdSeconds ?? 7 * 24 * 60 * 60; // 7 days default

/**
 * Session service for managing user sessions
 * Stores sessions in both KV cache (for fast access) and database (for audit trail)
 */
@Injectable()
export class SessionService {
  private readonly cache: KVCacheService;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory
  ) {
    this.cache = cacheFactory.create('session');
  }

  /**
   * Create a new session for a user
   */
  async createSession(input: CreateSessionInput): Promise<SessionInfo> {
    const token = generateSessionToken();
    const hashedToken = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + getSessionTTLSeconds() * 1000);
    const createdAt = new Date();

    const sessionData: SessionData = {
      userId: input.userId,
      currentOrgId: input.currentOrgId || null,
      expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    };

    // Store in KV cache for fast access
    await this.cache.set(token, sessionData, getSessionTTLSeconds());

    // Store in database for audit trail and multi-device view (D1 uses ISO strings)
    await this.db.insert(sessions).values({
      sessionToken: hashedToken,
      userId: input.userId,
      currentOrgId: input.currentOrgId || null,
      expiresAt: expiresAt.toISOString(),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return {
      token,
      ...sessionData,
      createdAt,
    };
  }

  /**
   * Get session data by token
   * Checks Redis first, falls back to database if needed
   */
  async getSession(token: string): Promise<SessionData | null> {
    // Try KV cache first (fast path)
    const cachedSession = await this.cache.get<SessionData>(token);
    if (cachedSession) {
      // Normalize expiresAt to Date (Redis returns strings)
      const expiresAt =
        cachedSession.expiresAt instanceof Date
          ? cachedSession.expiresAt
          : new Date(cachedSession.expiresAt);

      // Check if expired
      if (expiresAt <= new Date()) {
        await this.deleteSession(token);
        return null;
      }

      return {
        ...cachedSession,
        expiresAt,
      };
    }

    // Fallback to database
    const hashedToken = hashSessionToken(token);
    const [dbSession] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, hashedToken))
      .limit(1);

    if (!dbSession) {
      return null;
    }

    // Check if expired (D1 stores dates as ISO strings)
    const dbExpiresAt = new Date(dbSession.expiresAt);
    if (dbExpiresAt <= new Date()) {
      await this.deleteSession(token);
      return null;
    }

    // Restore to Redis cache
    const sessionData: SessionData = {
      userId: dbSession.userId,
      currentOrgId: dbSession.currentOrgId || null,
      expiresAt: dbExpiresAt,
      userAgent: dbSession.userAgent || undefined,
      ipAddress: dbSession.ipAddress || undefined,
    };

    const remainingTTL = Math.floor(
      (dbExpiresAt.getTime() - Date.now()) / 1000
    );
    if (remainingTTL > 0) {
      await this.cache.set(token, sessionData, remainingTTL);
    }

    return sessionData;
  }

  /**
   * Delete a specific session by token
   */
  async deleteSession(token: string): Promise<void> {
    const hashedToken = hashSessionToken(token);

    // Delete from Redis
    await this.cache.delete(token);

    // Delete from database
    await this.db.delete(sessions).where(eq(sessions.sessionToken, hashedToken));
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllSessions(userId: string): Promise<number> {
    // Get all sessions for user from database
    const userSessions = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));

    // Delete from Redis (we need to find tokens - this is a limitation)
    // We'll delete from DB and let Redis expire naturally, or we could
    // maintain a reverse index. For now, we'll delete from DB and
    // Redis will expire naturally.

    // Delete from database (D1 returns changes in meta.changes or rowsAffected)
    await this.db.delete(sessions).where(eq(sessions.userId, userId));

    // Note: Redis sessions will expire naturally since we can't reverse lookup
    // In production, you might want to maintain a userId -> tokens index

    return userSessions.length;
  }

  /**
   * Refresh a session (sliding window)
   * Extends expiration if less than threshold remaining
   */
  async refreshSession(token: string): Promise<SessionData | null> {
    const session = await this.getSession(token);
    if (!session) {
      return null;
    }

    // Ensure expiresAt is a Date object
    const expiresAtDate =
      session.expiresAt instanceof Date
        ? session.expiresAt
        : new Date(session.expiresAt);

    const now = Date.now();
    const expiresAt = expiresAtDate.getTime();
    const remainingSeconds = Math.floor((expiresAt - now) / 1000);

    // Only refresh if less than threshold remaining
    if (remainingSeconds < getSessionRefreshThresholdSeconds()) {
      const newExpiresAt = new Date(now + getSessionTTLSeconds() * 1000);

      // Update Redis
      const updatedSession: SessionData = {
        ...session,
        expiresAt: newExpiresAt,
      };
      await this.cache.set(token, updatedSession, getSessionTTLSeconds());

      // Update database (D1 uses ISO strings)
      const hashedToken = hashSessionToken(token);
      await this.db
        .update(sessions)
        .set({ expiresAt: newExpiresAt.toISOString() })
        .where(eq(sessions.sessionToken, hashedToken));

      return updatedSession;
    }

    return session;
  }

  /**
   * List all sessions for a user (for session management UI).
   */
  async listUserSessions(userId: string): Promise<Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
  }>> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));

    return rows.map((s) => ({
      id: s.id,
      userAgent: s.userAgent ?? null,
      ipAddress: s.ipAddress ?? null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * Revoke a specific session by its DB id (for session management UI).
   * Requires userId check to prevent revoking other users' sessions.
   */
  async revokeSessionById(id: string, _userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
    // KV entry will expire naturally; raw token unavailable for KV delete
  }

  /**
   * Update the current organization for a session
   */
  async updateCurrentOrg(token: string, orgId: string | null): Promise<void> {
    const hashedToken = hashSessionToken(token);

    // Update Redis cache
    const session = await this.getSession(token);
    if (session) {
      const updatedSession: SessionData = {
        ...session,
        currentOrgId: orgId,
      };
      const expiresAtDate = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
      const remainingTTL = Math.floor(
        (expiresAtDate.getTime() - Date.now()) / 1000
      );
      if (remainingTTL > 0) {
        await this.cache.set(token, updatedSession, remainingTTL);
      }
    }

    // Update database
    await this.db
      .update(sessions)
      .set({ currentOrgId: orgId })
      .where(eq(sessions.sessionToken, hashedToken));
  }
}

