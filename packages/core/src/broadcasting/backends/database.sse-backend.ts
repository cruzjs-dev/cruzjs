/**
 * Database SSE Backend (poll mode)
 *
 * Stores broadcast messages in the relational database so any instance
 * can publish and clients can poll across instances.
 *
 * Uses the `broadcastMessages` table defined in broadcast.schema.ts.
 * Messages are pruned by TTL via the `expiresAt` column.
 *
 * Best for: environments with a shared database (AWS RDS, Postgres, MySQL).
 * Works with D1 for single-region Cloudflare setups where KV is unavailable.
 */

import type { SSEBackend, SSEController } from '../sse-backend';
import type { BroadcastMessage } from '../broadcast.types';
import type { DrizzleDatabase } from '../../shared/database/drizzle.service';
import { broadcastMessages } from '../broadcast.schema';
import { gt, eq, and, lt } from 'drizzle-orm';

export class DatabaseSSEBackend implements SSEBackend {
  readonly mode = 'poll' as const;

  constructor(private readonly db: DrizzleDatabase) {}

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute TTL
    await (this.db as any).insert(broadcastMessages).values({
      id: message.id,
      channel,
      event: message.event,
      data: message.data,
      timestamp: message.timestamp,
      expiresAt,
    });
  }

  addConnection(_channel: string, _controller: SSEController): () => void {
    return () => {};
  }

  async poll(channel: string, since?: string): Promise<BroadcastMessage[]> {
    const now = new Date();
    const baseConditions = and(
      eq(broadcastMessages.channel, channel),
      gt(broadcastMessages.expiresAt, now),
    );
    const conditions = since
      ? and(baseConditions, gt(broadcastMessages.timestamp, since))
      : baseConditions;

    const rows = await (this.db as any)
      .select()
      .from(broadcastMessages)
      .where(conditions)
      .orderBy(broadcastMessages.timestamp)
      .limit(50);

    return rows.map((r: any) => ({
      id: r.id,
      channel: r.channel,
      event: r.event,
      data: r.data,
      timestamp: r.timestamp,
    }));
  }

  getConnectionCount(_channel: string): number {
    return 0;
  }
}
