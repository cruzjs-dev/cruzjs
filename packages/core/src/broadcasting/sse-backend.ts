/**
 * SSE Backend Interface
 *
 * Abstracts how SSE messages are stored and delivered.
 * - 'push' mode: in-memory Map of controllers (single-instance only)
 * - 'poll' mode: messages written to a shared store (KV/DB) and polled by clients
 */

import { createToken } from '../di/tokens/create-token';
import { createId } from '@paralleldrive/cuid2';
import type { BroadcastMessage } from './broadcast.types';

/** Minimal interface for enqueuing SSE text chunks to a client stream */
export type SSEController = { enqueue(chunk: string): void };

export interface SSEBackend {
  /** 'push' = direct in-memory delivery; 'poll' = store for client polling */
  readonly mode: 'push' | 'poll';

  /** Publish a message to a channel */
  publish(channel: string, message: BroadcastMessage): Promise<void>;

  /**
   * Register an SSE controller for push-mode delivery.
   * Poll-mode backends implement this as a no-op.
   * Returns an unsubscribe function.
   */
  addConnection(channel: string, controller: SSEController): () => void;

  /**
   * Poll for messages newer than `since` (ISO timestamp of last received message).
   * Push-mode backends return [].
   */
  poll(channel: string, since?: string): Promise<BroadcastMessage[]>;

  /** Get the number of active local connections on a channel (push mode only) */
  getConnectionCount(channel: string): number;
}

/** DI token for injecting the SSE backend */
export const SSE_BACKEND = createToken<SSEBackend>('SSE_BACKEND');

/**
 * In-memory SSE backend (push mode).
 * Works for single-instance deployments (Docker, Node.js, local dev).
 * Each process has its own Map of SSE controllers.
 */
export class InMemorySSEBackend implements SSEBackend {
  readonly mode = 'push' as const;
  private readonly connections = new Map<string, Set<SSEController>>();

  addConnection(channel: string, controller: SSEController): () => void {
    if (!this.connections.has(channel)) {
      this.connections.set(channel, new Set());
    }
    const set = this.connections.get(channel)!;
    set.add(controller);

    return () => {
      set.delete(controller);
      if (set.size === 0) {
        this.connections.delete(channel);
      }
    };
  }

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    const controllers = this.connections.get(channel);
    if (!controllers || controllers.size === 0) return;

    const ssePayload = `id: ${message.id}\nevent: ${message.event}\ndata: ${JSON.stringify(message)}\n\n`;

    for (const controller of controllers) {
      try {
        controller.enqueue(ssePayload);
      } catch {
        controllers.delete(controller);
      }
    }

    if (controllers.size === 0) {
      this.connections.delete(channel);
    }
  }

  async poll(_channel: string, _since?: string): Promise<BroadcastMessage[]> {
    return [];
  }

  getConnectionCount(channel: string): number {
    return this.connections.get(channel)?.size ?? 0;
  }

  /** Get total connection count across all channels */
  getTotalConnectionCount(): number {
    let total = 0;
    for (const set of this.connections.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Broadcast a raw event to all connections on a channel.
   * Convenience method that constructs a BroadcastMessage and publishes it.
   * Backward-compatible with the old SSEConnectionRegistry.broadcast() API.
   */
  broadcast(channel: string, event: string, data: unknown): void {
    const message: BroadcastMessage = {
      id: createId(),
      channel,
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    // Fire-and-forget since in-memory publish is synchronous internally
    void this.publish(channel, message);
  }

  /** Clear all connections (for testing) */
  clear(): void {
    this.connections.clear();
  }
}

/** Default singleton backend — used by non-DI callers (e.g. createSSEResponse) */
export const defaultSSEBackend = new InMemorySSEBackend();
