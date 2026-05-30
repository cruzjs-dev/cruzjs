/**
 * Docker / Self-Hosted Broadcast Adapter
 *
 * Uses the InMemorySSEBackend for single-container SSE delivery and
 * in-memory presence tracking. For multi-container setups, Redis pub/sub
 * should be added in the future.
 *
 * Falls back gracefully: the InMemorySSEBackend (push mode) is always
 * available regardless of Redis configuration.
 */

import type { BroadcastAdapter, PresenceMember, SSEBackend, BroadcastMessage } from '@cruzjs/core/broadcasting';
import { defaultSSEBackend } from '@cruzjs/core/broadcasting';

export class DockerBroadcastAdapter implements BroadcastAdapter {
  private readonly inMemoryPresence = new Map<string, PresenceMember[]>();
  readonly sseBackend: SSEBackend;

  constructor(
    private readonly redisUrl: string | null,
  ) {
    // TODO: When Redis is available, use a Redis-backed SSEBackend
    // that subscribes to PUBLISH messages and forwards to local SSE controllers.
    this.sseBackend = defaultSSEBackend;
  }

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis PUBLISH `broadcast:${channel}` JSON.stringify(message)
      // Each container instance subscribes and forwards to its sseBackend.
    }

    await this.sseBackend.publish(channel, message);
  }

  async getPresence(channel: string): Promise<PresenceMember[]> {
    if (this.redisUrl) {
      // TODO: Redis HGETALL `presence:${channel}`, parse each value as PresenceMember
    }
    return this.inMemoryPresence.get(channel) ?? [];
  }

  async joinPresence(channel: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis HSET `presence:${channel}` userId JSON.stringify({ userId, metadata, joinedAt })
    }
    const members = this.inMemoryPresence.get(channel) ?? [];
    const filtered = members.filter((m) => m.userId !== userId);
    filtered.push({ userId, metadata, joinedAt: new Date().toISOString() });
    this.inMemoryPresence.set(channel, filtered);
  }

  async leavePresence(channel: string, userId: string): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis HDEL `presence:${channel}` userId
    }
    const members = this.inMemoryPresence.get(channel) ?? [];
    this.inMemoryPresence.set(channel, members.filter((m) => m.userId !== userId));
  }
}
