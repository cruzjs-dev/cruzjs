import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and, desc } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import {
  integrationConnections,
  integrationSyncLogs,
} from '../database/schema';
import { TRPCError } from '@trpc/server';
import type {
  IntegrationProvider,
  IntegrationConfig,
  ConnectionStatus,
  SyncStatus,
  SyncDirection,
  IntegrationConnectionSummary,
  SyncHistoryEntry,
} from './integration.types';

/**
 * IntegrationService
 *
 * Core service for managing integration connections and sync logs.
 * Handles CRUD operations for connections, encrypted credential storage,
 * and sync history tracking. Provider-specific logic lives in dedicated
 * sync service files (figma, sentry).
 */
@Injectable()
export class IntegrationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  // ============================================================================
  // Connection CRUD
  // ============================================================================

  /**
   * Create a new integration connection for an org
   */
  async createConnection(
    orgId: string,
    provider: IntegrationProvider,
    name: string,
    config: IntegrationConfig,
    createdBy: string,
  ): Promise<{ id: string }> {
    const [conn] = await this.db
      .insert(integrationConnections)
      .values({
        orgId,
        provider,
        name,
        status: 'ACTIVE',
        config: JSON.stringify(config),
        createdBy,
      })
      .returning({ id: integrationConnections.id });

    return { id: conn.id };
  }

  /**
   * Get a connection by ID (org-scoped)
   */
  async getConnection(orgId: string, connectionId: string) {
    const [conn] = await this.db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.orgId, orgId),
        )
      )
      .limit(1);

    if (!conn) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration connection not found' });
    }

    return conn;
  }

  /**
   * List connections for an org, optionally filtered by provider
   */
  async listConnections(
    orgId: string,
    provider?: IntegrationProvider,
  ): Promise<IntegrationConnectionSummary[]> {
    const conditions = [eq(integrationConnections.orgId, orgId)];
    if (provider) {
      conditions.push(eq(integrationConnections.provider, provider));
    }

    const conns = await this.db
      .select()
      .from(integrationConnections)
      .where(and(...conditions))
      .orderBy(desc(integrationConnections.createdAt));

    return conns.map((c) => ({
      id: c.id,
      orgId: c.orgId,
      provider: c.provider as IntegrationProvider,
      name: c.name,
      status: c.status as ConnectionStatus,
      config: JSON.parse(c.config ?? '{}') as IntegrationConfig,
      lastSyncAt: c.lastSyncAt,
      lastSyncStatus: (c.lastSyncStatus ?? null) as SyncStatus | null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Update a connection's config and/or name
   */
  async updateConnection(
    orgId: string,
    connectionId: string,
    updates: {
      name?: string;
      config?: IntegrationConfig;
      status?: ConnectionStatus;
    },
  ): Promise<void> {
    const values: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) values.name = updates.name;
    if (updates.config !== undefined) values.config = JSON.stringify(updates.config);
    if (updates.status !== undefined) values.status = updates.status;

    const result = await this.db
      .update(integrationConnections)
      .set(values)
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.orgId, orgId),
        )
      )
      .returning({ id: integrationConnections.id });

    if (!result.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration connection not found' });
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(orgId: string, connectionId: string): Promise<void> {
    const result = await this.db
      .delete(integrationConnections)
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.orgId, orgId),
        )
      )
      .returning({ id: integrationConnections.id });

    if (!result.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration connection not found' });
    }
  }

  // ============================================================================
  // Sync Logging
  // ============================================================================

  /**
   * Create a sync log entry when a sync starts
   */
  async createSyncLog(
    connectionId: string,
    orgId: string,
    provider: IntegrationProvider,
    direction: SyncDirection,
  ): Promise<string> {
    const [log] = await this.db
      .insert(integrationSyncLogs)
      .values({
        connectionId,
        orgId,
        provider,
        direction,
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
      })
      .returning({ id: integrationSyncLogs.id });

    return log.id;
  }

  /**
   * Update a sync log with results
   */
  async completeSyncLog(
    syncLogId: string,
    status: SyncStatus,
    results: {
      itemsSynced?: number;
      itemsFailed?: number;
      itemsSkipped?: number;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    await this.db
      .update(integrationSyncLogs)
      .set({
        status,
        itemsSynced: results.itemsSynced ?? 0,
        itemsFailed: results.itemsFailed ?? 0,
        itemsSkipped: results.itemsSkipped ?? 0,
        errorMessage: results.errorMessage ?? null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(integrationSyncLogs.id, syncLogId));
  }

  /**
   * Update the connection's last sync info
   */
  async updateLastSync(
    connectionId: string,
    status: SyncStatus,
  ): Promise<void> {
    await this.db
      .update(integrationConnections)
      .set({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(integrationConnections.id, connectionId));
  }

  /**
   * Get sync history for a connection
   */
  async getSyncHistory(
    orgId: string,
    connectionId: string,
    limit: number = 20,
  ): Promise<SyncHistoryEntry[]> {
    const logs = await this.db
      .select()
      .from(integrationSyncLogs)
      .where(
        and(
          eq(integrationSyncLogs.connectionId, connectionId),
          eq(integrationSyncLogs.orgId, orgId),
        )
      )
      .orderBy(desc(integrationSyncLogs.startedAt))
      .limit(limit);

    return logs.map((l) => ({
      id: l.id,
      connectionId: l.connectionId,
      provider: l.provider as IntegrationProvider,
      direction: l.direction as SyncDirection,
      status: l.status as SyncStatus,
      itemsSynced: l.itemsSynced ?? 0,
      itemsFailed: l.itemsFailed ?? 0,
      itemsSkipped: l.itemsSkipped ?? 0,
      errorMessage: l.errorMessage,
      startedAt: l.startedAt ?? l.createdAt,
      completedAt: l.completedAt,
    }));
  }
}
