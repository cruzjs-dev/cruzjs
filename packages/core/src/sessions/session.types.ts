/**
 * Session Management Types
 *
 * Core types for the CruzJS session management system.
 */

import { createToken } from '../di/tokens/create-token';
import type { SessionAdapter } from './session.adapter';

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  deviceLabel: string | null;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  maxSessionsPerUser: number;
  sessionTtlSeconds: number;
  touchIntervalSeconds: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxSessionsPerUser: 10,
  sessionTtlSeconds: 30 * 24 * 60 * 60,
  touchIntervalSeconds: 60,
} satisfies SessionConfig;

/** DI token for injecting a platform-specific SessionAdapter */
export const SESSION_ADAPTER = createToken<SessionAdapter>('SESSION_ADAPTER');
