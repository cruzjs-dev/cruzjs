/**
 * Cloudflare Broadcast Adapter
 *
 * Handles presence tracking via KV.
 * SSE message delivery is handled by KVSSEBackend, which is wired as SSE_BACKEND
 * by the framework when CloudflareAdapter.getSSEBackend() returns a KVSSEBackend.
 */

import type { BroadcastAdapter, PresenceMember } from '@cruzjs/core/broadcasting';
import type { BroadcastMessage } from '@cruzjs/core/broadcasting';

const PRESENCE_PREFIX = 'broadcast-presence:';

export class CloudflareBroadcastAdapter implements BroadcastAdapter {
  constructor(private readonly kv: KVNamespace | null) {}

  async publish(_channel: string, _message: BroadcastMessage): Promise<void> {
    // SSE delivery is handled by KVSSEBackend (bound as SSE_BACKEND in DI).
    // This method is a no-op since BroadcastService calls sseBackend.publish() directly.
  }

  async getPresence(channel: string): Promise<PresenceMember[]> {
    if (!this.kv) return [];
    const key = `${PRESENCE_PREFIX}${channel}`;
    return await this.kv.get<PresenceMember[]>(key, 'json') ?? [];
  }

  async joinPresence(channel: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.kv) return;
    const key = `${PRESENCE_PREFIX}${channel}`;
    const existing = await this.kv.get<PresenceMember[]>(key, 'json') ?? [];
    const filtered = existing.filter((m) => m.userId !== userId);
    filtered.push({ userId, metadata, joinedAt: new Date().toISOString() });
    await this.kv.put(key, JSON.stringify(filtered), { expirationTtl: 86400 });
  }

  async leavePresence(channel: string, userId: string): Promise<void> {
    if (!this.kv) return;
    const key = `${PRESENCE_PREFIX}${channel}`;
    const existing = await this.kv.get<PresenceMember[]>(key, 'json') ?? [];
    const filtered = existing.filter((m) => m.userId !== userId);
    if (filtered.length === 0) {
      await this.kv.delete(key);
    } else {
      await this.kv.put(key, JSON.stringify(filtered), { expirationTtl: 86400 });
    }
  }
}
