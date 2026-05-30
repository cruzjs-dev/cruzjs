/**
 * Database Session Adapter
 *
 * Default session storage using Drizzle ORM + SQLite/D1.
 * Used as the fallback when no platform-specific adapter is provided.
 */

import { eq, and, lt, isNotNull, or, isNull } from 'drizzle-orm';
import { Injectable, Inject } from '../../di';
import { DRIZZLE, type DrizzleDatabase } from '../../shared/database/drizzle.service';
import type { SessionAdapter } from '../session.adapter';
import type { SessionData } from '../session.types';
import { managedSessions } from '../session.schema';

@Injectable()
export class DatabaseSessionAdapter implements SessionAdapter {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async store(session: SessionData): Promise<void> {
    await this.db.insert(managedSessions).values({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceFingerprint: session.deviceFingerprint,
      deviceLabel: session.deviceLabel,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      metadata: session.metadata,
      createdAt: session.createdAt,
    });
  }

  async retrieve(tokenHash: string): Promise<SessionData | null> {
    const rows = await this.db
      .select()
      .from(managedSessions)
      .where(eq(managedSessions.tokenHash, tokenHash))
      .limit(1);

    return rows[0] ? this.toSessionData(rows[0]) : null;
  }

  async retrieveById(id: string): Promise<SessionData | null> {
    const rows = await this.db
      .select()
      .from(managedSessions)
      .where(eq(managedSessions.id, id))
      .limit(1);

    return rows[0] ? this.toSessionData(rows[0]) : null;
  }

  async listByUser(userId: string): Promise<SessionData[]> {
    const rows = await this.db
      .select()
      .from(managedSessions)
      .where(eq(managedSessions.userId, userId));

    return rows.map((row) => this.toSessionData(row));
  }

  async touch(id: string, lastActiveAt: Date): Promise<void> {
    await this.db
      .update(managedSessions)
      .set({ lastActiveAt })
      .where(eq(managedSessions.id, id));
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(managedSessions)
      .set({ revokedAt: new Date() })
      .where(eq(managedSessions.id, id));
  }

  async revokeAll(userId: string): Promise<void> {
    await this.db
      .update(managedSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(managedSessions.userId, userId),
          isNull(managedSessions.revokedAt),
        ),
      );
  }

  async prune(): Promise<number> {
    const now = new Date();

    // Delete sessions that are expired or revoked
    const result = await this.db
      .delete(managedSessions)
      .where(
        or(
          lt(managedSessions.expiresAt, now),
          isNotNull(managedSessions.revokedAt),
        ),
      )
      .returning({ id: managedSessions.id });

    return result.length;
  }

  private toSessionData(row: typeof managedSessions.$inferSelect): SessionData {
    return {
      id: row.id,
      userId: row.userId,
      token: '', // Raw token is never stored; empty string for retrieved sessions
      tokenHash: row.tokenHash,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      deviceFingerprint: row.deviceFingerprint,
      deviceLabel: row.deviceLabel,
      lastActiveAt: row.lastActiveAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
    };
  }
}
