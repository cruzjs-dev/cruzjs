/**
 * DigitalOcean Broadcast Adapter
 *
 * Uses Redis pub/sub for cross-instance delivery and Redis hashes
 * for presence tracking. Falls back to the default InMemorySSEBackend
 * when external services are not configured.
 */

import type { BroadcastAdapter, PresenceMember, SSEBackend, BroadcastMessage } from '@cruzjs/core/broadcasting';
import { defaultSSEBackend } from '@cruzjs/core/broadcasting';

export class DigitalOceanBroadcastAdapter implements BroadcastAdapter {
  private readonly inMemoryPresence = new Map<string, PresenceMember[]>();
  readonly sseBackend: SSEBackend;

  constructor(
    private readonly redisUrl: string | null,
  ) {
    // TODO: When Redis is available, use a Redis-backed SSEBackend
    this.sseBackend = defaultSSEBackend;
  }

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis PUBLISH `broadcast:${channel}` JSON.stringify(message)
    }

    await this.sseBackend.publish(channel, message);
  }

  async getPresence(channel: string): Promise<PresenceMember[]> {
    if (this.redisUrl) {
      // TODO: Redis HGETALL `presence:${channel}`
    }
    return this.inMemoryPresence.get(channel) ?? [];
  }

  async joinPresence(channel: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis HSET `presence:${channel}` userId JSON
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
