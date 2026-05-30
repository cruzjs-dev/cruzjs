/**
 * Broadcast Adapter Interface
 *
 * Provider-agnostic interface for broadcasting backends.
 * Implementations may use SSE, KV, Redis, Pub/Sub, SignalR, etc.
 */

import type { BroadcastMessage, PresenceMember } from './broadcast.types';

export interface BroadcastAdapter {
  /** Publish an event to a channel */
  publish(channel: string, message: BroadcastMessage): Promise<void>;

  /** Get presence members for a channel */
  getPresence(channel: string): Promise<PresenceMember[]>;

  /** Join a presence channel */
  joinPresence(channel: string, userId: string, metadata?: Record<string, unknown>): Promise<void>;

  /** Leave a presence channel */
  leavePresence(channel: string, userId: string): Promise<void>;
}
