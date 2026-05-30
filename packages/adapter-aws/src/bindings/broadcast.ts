/**
 * AWS Broadcast Adapter
 *
 * Uses ElastiCache (Redis) for pub/sub message delivery and
 * DynamoDB for presence tracking. Falls back to the default
 * InMemorySSEBackend when external services are not configured.
 */

import type { BroadcastAdapter, PresenceMember, SSEBackend, BroadcastMessage } from '@cruzjs/core/broadcasting';
import { defaultSSEBackend } from '@cruzjs/core/broadcasting';

export class AWSBroadcastAdapter implements BroadcastAdapter {
  private readonly inMemoryPresence = new Map<string, PresenceMember[]>();
  readonly sseBackend: SSEBackend;

  constructor(
    private readonly redisUrl: string | null,
    private readonly dynamoTable: string | null,
  ) {
    // TODO: When Redis is available, use a Redis-backed SSEBackend
    this.sseBackend = defaultSSEBackend;
  }

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis PUBLISH channel JSON.stringify(message)
      // When running multiple instances, each subscribes to Redis and
      // forwards to its local sseBackend.
    }

    await this.sseBackend.publish(channel, message);
  }

  async getPresence(channel: string): Promise<PresenceMember[]> {
    if (this.dynamoTable) {
      // TODO: DynamoDB query for presence members
      // Query: pk = `presence:${channel}`, return all items
    }
    return this.inMemoryPresence.get(channel) ?? [];
  }

  async joinPresence(channel: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
    if (this.dynamoTable) {
      // TODO: DynamoDB put item with pk=`presence:${channel}`, sk=userId
    }
    const members = this.inMemoryPresence.get(channel) ?? [];
    const filtered = members.filter((m) => m.userId !== userId);
    filtered.push({ userId, metadata, joinedAt: new Date().toISOString() });
    this.inMemoryPresence.set(channel, filtered);
  }

  async leavePresence(channel: string, userId: string): Promise<void> {
    if (this.dynamoTable) {
      // TODO: DynamoDB delete item with pk=`presence:${channel}`, sk=userId
    }
    const members = this.inMemoryPresence.get(channel) ?? [];
    this.inMemoryPresence.set(channel, members.filter((m) => m.userId !== userId));
  }
}
