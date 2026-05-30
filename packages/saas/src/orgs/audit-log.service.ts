import { authIdentity } from '@cruzjs/core/database/schema';
import { auditLogs } from '../database/schema';
import { userProfile } from '@cruzjs/start/database/schema';
import { and, desc, eq, gte, lt, lte } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import type {
  AuditAction,
  AuditLogEntry,
  AuditLogFilters,
  AuditResource,
} from './org.models';

/**
 * Parse metadata JSON string to object
 */
function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Audit log service for tracking organization actions
 */
@injectable()
export class AuditLogService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Create an audit log entry
   */
  async logAudit(
    orgId: string,
    userId: string | null,
    action: AuditAction,
    resource: AuditResource,
    metadata?: Record<string, unknown>,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    await this.db.insert(auditLogs).values({
      orgId,
      userId: userId || null,
      action,
      resource,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  /**
   * Get audit logs for an organization with filters and pagination
   */
  async getAuditLogs(
    orgId: string,
    filters?: AuditLogFilters
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const conditions = [eq(auditLogs.orgId, orgId)];

    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters?.resource) {
      conditions.push(eq(auditLogs.resource, filters.resource));
    }

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate.toISOString()));
    }

    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate.toISOString()));
    }

    const whereClause = and(...conditions);

    // Fetch logs
    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .offset(filters?.skip || 0)
      .limit(filters?.limit || 50);

    // Fetch total count
    const allLogs = await this.db
      .select()
      .from(auditLogs)
      .where(whereClause);
    const total = allLogs.length;

    // Get unique user IDs
    const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => id !== null))];

    // Fetch user data
    const identities = userIds.length > 0
      ? await this.db.select().from(authIdentity)
      : [];
    const profiles = userIds.length > 0
      ? await this.db.select().from(userProfile)
      : [];

    const identityMap = new Map(identities.map((i) => [i.id, i]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return {
      logs: logs.map((log) => {
        const identity = log.userId ? identityMap.get(log.userId) : undefined;
        const profile = log.userId ? profileMap.get(log.userId) : undefined;
        return {
          id: log.id,
          orgId: log.orgId || '',
          userId: log.userId,
          action: log.action as AuditAction,
          resource: log.resource as AuditResource,
          metadata: parseMetadata(log.metadata),
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: new Date(log.createdAt),
          user:
            log.userId && identity?.email
              ? {
                  id: log.userId,
                  name: profile?.fullName ?? null,
                  email: identity.email,
                  avatarUrl: profile?.avatarUrl ?? null,
                }
              : null,
        };
      }),
      total,
    };
  }

  /**
   * Export audit logs for an organization
   * Returns logs in JSON format (can be extended to support CSV, etc.)
   */
  async exportAuditLogs(
    orgId: string,
    filters?: AuditLogFilters
  ): Promise<AuditLogEntry[]> {
    const conditions = [eq(auditLogs.orgId, orgId)];

    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters?.resource) {
      conditions.push(eq(auditLogs.resource, filters.resource));
    }

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate.toISOString()));
    }

    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate.toISOString()));
    }

    const whereClause = and(...conditions);

    // Fetch logs
    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt));

    // Get unique user IDs
    const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => id !== null))];

    // Fetch user data
    const identities = userIds.length > 0
      ? await this.db.select().from(authIdentity)
      : [];
    const profiles = userIds.length > 0
      ? await this.db.select().from(userProfile)
      : [];

    const identityMap = new Map(identities.map((i) => [i.id, i]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return logs.map((log) => {
      const identity = log.userId ? identityMap.get(log.userId) : undefined;
      const profile = log.userId ? profileMap.get(log.userId) : undefined;
      return {
        id: log.id,
        orgId: log.orgId || '',
        userId: log.userId,
        action: log.action as AuditAction,
        resource: log.resource as AuditResource,
        metadata: parseMetadata(log.metadata),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: new Date(log.createdAt),
        user:
          log.userId && identity?.email
            ? {
                id: log.userId,
                name: profile?.fullName ?? null,
                email: identity.email,
                avatarUrl: profile?.avatarUrl ?? null,
              }
            : null,
      };
    });
  }

  /**
   * Delete audit logs older than specified date
   * Used for log retention policy
   */
  async cleanupOldAuditLogs(olderThan: Date): Promise<number> {
    await this.db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, olderThan.toISOString()));

    // D1 doesn't return rowCount, so we return 0
    return 0;
  }
}
