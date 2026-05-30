/**
 * Admin Impersonation
 *
 * Schema and service for admin user impersonation. Generates short-lived,
 * single-use tokens that let an admin sign in as another user.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc } from 'drizzle-orm';

// Table + factory live in a decorator-free sibling so the database/schema
// barrel can import them without dragging this file's decorated service into
// drizzle-kit's esbuild transform (which can't handle parameter decorators).
// Re-exported here for back-compat.
import { impersonationTokens } from './admin.impersonation.schema';
export {
  createImpersonationSchema,
  impersonationTokens,
} from './admin.impersonation.schema';
export type {
  ImpersonationToken,
  NewImpersonationToken,
} from './admin.impersonation.schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random hex token. */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Service ─────────────────────────────────────────────────────────────────

/** Default token lifetime: 5 minutes */
const TOKEN_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ImpersonationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  /**
   * Create a short-lived impersonation token.
   */
  async create(
    targetUserId: string,
    adminUserId: string,
  ): Promise<ImpersonationToken> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const [row] = await this.db
      .insert(impersonationTokens)
      .values({
        targetUserId,
        adminUserId,
        token,
        expiresAt,
      })
      .returning();

    return row;
  }

  /**
   * Verify a token without consuming it.
   * Returns `null` if the token is expired, already used, or does not exist.
   */
  async verify(token: string): Promise<ImpersonationToken | null> {
    const [row] = await this.db
      .select()
      .from(impersonationTokens)
      .where(eq(impersonationTokens.token, token))
      .limit(1);

    if (!row) return null;
    if (row.usedAt) return null;
    if (new Date(row.expiresAt) < new Date()) return null;

    return row;
  }

  /**
   * Consume (mark as used) an impersonation token.
   * Returns the token record if valid, throws otherwise.
   */
  async consume(token: string): Promise<ImpersonationToken> {
    const valid = await this.verify(token);
    if (!valid) {
      throw new Error('Invalid or expired impersonation token');
    }

    const now = new Date().toISOString();
    const [row] = await this.db
      .update(impersonationTokens)
      .set({ usedAt: now })
      .where(eq(impersonationTokens.id, valid.id))
      .returning();

    return row;
  }

  /**
   * List all impersonation tokens created by a given admin.
   */
  async list(adminUserId: string): Promise<ImpersonationToken[]> {
    return this.db
      .select()
      .from(impersonationTokens)
      .where(eq(impersonationTokens.adminUserId, adminUserId))
      .orderBy(desc(impersonationTokens.createdAt));
  }
}
