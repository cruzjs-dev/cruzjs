/**
 * Audit Log Types
 *
 * Core types for the audit logging system.
 * Tracks who did what, when, and to which resource.
 */

import { createToken } from '../di/tokens/create-token';
import type { AuditLogAdapter } from './audit.adapter';

export const AuditAction = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export',
  IMPORT: 'import',
  PERMISSION_CHANGE: 'permission_change',
  REVOKE: 'revoke',
  INVITE: 'invite',
  ACCEPT_INVITE: 'accept_invite',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditActorType = {
  USER: 'user',
  SYSTEM: 'system',
  API_KEY: 'api_key',
} as const;
export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  actorType: AuditActorType;
  orgId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorId?: string;
  actorType?: AuditActorType;
  orgId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  orgId?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  page?: number;
  perPage?: number;
}

/** DI token for injecting an external audit log adapter */
export const AUDIT_LOG_ADAPTER = createToken<AuditLogAdapter>('AUDIT_LOG_ADAPTER');
