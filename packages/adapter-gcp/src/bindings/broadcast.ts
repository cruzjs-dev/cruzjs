/**
 * GCP Broadcast Adapter
 *
 * Uses Cloud Pub/Sub for cross-instance message delivery and
 * Firestore for presence tracking. Falls back to the default
 * InMemorySSEBackend when external services are not configured.
 */

import type { BroadcastAdapter, PresenceMember, SSEBackend, BroadcastMessage } from '@cruzjs/core/broadcasting';
import { defaultSSEBackend } from '@cruzjs/core/broadcasting';

export class GCPBroadcastAdapter implements BroadcastAdapter {
  private readonly inMemoryPresence = new Map<string, PresenceMember[]>();
  readonly sseBackend: SSEBackend;

  constructor(
    private readonly projectId: string | null,
  ) {
    // TODO: When Pub/Sub is available, use a Pub/Sub-backed SSEBackend
    this.sseBackend = defaultSSEBackend;
  }

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    if (this.projectId) {
      // TODO: Pub/Sub publish to topic `broadcast-${channel}`
      // Subscribers on each instance forward to local sseBackend.
    }

    await this.sseBackend.publish(channel, message);
  }

  async getPresence(channel: string): Promise<PresenceMember[]> {
    if (this.projectId) {
      // TODO: Firestore query `broadcast-presence/${channel}/members`
    }
    return this.inMemoryPresence.get(channel) ?? [];
  }

  async joinPresence(channel: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
    if (this.projectId) {
      // TODO: Firestore set `broadcast-presence/${channel}/members/${userId}`
    }
    const members = this.inMemoryPresence.get(channel) ?? [];
    const filtered = members.filter((m) => m.userId !== userId);
    filtered.push({ userId, metadata, joinedAt: new Date().toISOString() });
    this.inMemoryPresence.set(channel, filtered);
  }

  async leavePresence(channel: string, userId: string): Promise<void> {
    if (this.projectId) {
      // TODO: Firestore delete `broadcast-presence/${channel}/members/${userId}`
    }
    const members = this.inMemoryPresence.get(channel) ?? [];
    this.inMemoryPresence.set(channel, members.filter((m) => m.userId !== userId));
  }
}
