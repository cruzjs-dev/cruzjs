/**
 * Broadcast Service
 *
 * Central service for publishing events to channels and managing presence.
 * Uses SSEBackend for message delivery (push or poll mode) and an optional
 * BroadcastAdapter for presence tracking.
 */

import { Injectable, Inject, Optional } from '../di';
import { createToken } from '../di/tokens/create-token';
import { createId } from '@paralleldrive/cuid2';
import type { BroadcastAdapter } from './broadcast.adapter';
import type { BroadcastEvent } from './broadcast.event';
import type { BroadcastChannel, PresenceChannel } from './broadcast.channel';
import type { PresenceMember, BroadcastMessage } from './broadcast.types';
import type { SSEBackend } from './sse-backend';
import { SSE_BACKEND, defaultSSEBackend } from './sse-backend';

/** DI token for injecting a platform-specific BroadcastAdapter */
export const BROADCAST_ADAPTER = createToken<BroadcastAdapter>('BROADCAST_ADAPTER');

@Injectable()
export class BroadcastService {
  private readonly adapter: BroadcastAdapter | null;
  private readonly sseBackend: SSEBackend;

  constructor(
    @Inject(BROADCAST_ADAPTER) @Optional() adapter?: BroadcastAdapter,
    @Inject(SSE_BACKEND) @Optional() sseBackend?: SSEBackend,
  ) {
    this.adapter = adapter ?? null;
    this.sseBackend = sseBackend ?? defaultSSEBackend;
  }

  /**
   * Broadcast a BroadcastEvent to all its channels.
   * Calls broadcastOn() to get channels, broadcastAs() for the event name,
   * and broadcastWith() for the payload.
   */
  async broadcast(event: BroadcastEvent): Promise<void> {
    const channels = event.broadcastOn();
    const eventName = event.broadcastAs();
    const data = event.broadcastWith();

    await Promise.all(
      channels.map((ch) => this.publish(ch, eventName, data)),
    );
  }

  /**
   * Publish directly to a channel.
   * Accepts a channel name string or a BroadcastChannel instance.
   */
  async publish(channel: string | BroadcastChannel, event: string, data: unknown): Promise<void> {
    const channelName = typeof channel === 'string' ? channel : channel.name;

    const message: BroadcastMessage = {
      id: createId(),
      channel: channelName,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    // Publish via adapter if available (distributed backends for presence, etc.)
    if (this.adapter) {
      await this.adapter.publish(channelName, message);
    }

    // Deliver via SSE backend (push = in-memory, poll = KV/DB store)
    await this.sseBackend.publish(channelName, message);
  }

  /** Get presence members for a channel */
  async getPresence(channel: string | PresenceChannel): Promise<PresenceMember[]> {
    const channelName = typeof channel === 'string' ? channel : channel.name;

    if (this.adapter) {
      return this.adapter.getPresence(channelName);
    }

    return [];
  }

  /** Track a user joining a presence channel */
  async joinPresence(
    channel: string | PresenceChannel,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const channelName = typeof channel === 'string' ? channel : channel.name;

    if (this.adapter) {
      await this.adapter.joinPresence(channelName, userId, metadata);
    }
  }

  /** Track a user leaving a presence channel */
  async leavePresence(
    channel: string | PresenceChannel,
    userId: string,
  ): Promise<void> {
    const channelName = typeof channel === 'string' ? channel : channel.name;

    if (this.adapter) {
      await this.adapter.leavePresence(channelName, userId);
    }
  }
}
