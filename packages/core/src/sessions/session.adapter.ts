/**
 * Session Adapter Interface
 *
 * Provider-agnostic interface for session storage backends.
 * Implementations may use KV, Redis, DynamoDB, database, etc.
 */

import type { SessionData } from './session.types';

export interface SessionAdapter {
  /** Store a new session */
  store(session: SessionData): Promise<void>;

  /** Retrieve a session by token hash */
  retrieve(tokenHash: string): Promise<SessionData | null>;

  /** Retrieve a session by ID */
  retrieveById(id: string): Promise<SessionData | null>;

  /** List all sessions for a user */
  listByUser(userId: string): Promise<SessionData[]>;

  /** Update the last active timestamp */
  touch(id: string, lastActiveAt: Date): Promise<void>;

  /** Revoke a single session */
  revoke(id: string): Promise<void>;

  /** Revoke all sessions for a user */
  revokeAll(userId: string): Promise<void>;

  /** Remove expired and revoked sessions; returns count of pruned sessions */
  prune(): Promise<number>;
}
