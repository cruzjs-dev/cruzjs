/**
 * KV SSE Backend (poll mode)
 *
 * Stores each broadcast message as its own KV entry, eliminating the
 * concurrent read-modify-write race condition of the single-array approach.
 *
 * Key format: `sse:msg:{channel}:{paddedTimestampMs}_{id}`
 * - Zero-padded 16-char timestamp ensures lexicographic order = chronological order
 * - Each message has its own TTL (5 minutes)
 * - No read-before-write; publish is a single atomic put
 *
 * Poll: lists all keys for the channel, filters by timestamp > since,
 * then fetches values in parallel.
 *
 * Trade-offs vs. single-array approach:
 * - Eliminates race condition on concurrent publishes
 * - O(N) KV reads per poll (N = new messages since last poll)
 * - KV list() is eventually consistent (~1s lag globally)
 * - For production high-throughput, prefer Cloudflare Durable Objects
 */

import type { SSEBackend, SSEController } from '../sse-backend';
import type { BroadcastMessage } from '../broadcast.types';

const KEY_PREFIX = 'sse:msg:';
const TTL_SECONDS = 300; // 5 minutes

function makeKey(channel: string, message: BroadcastMessage): string {
  const tsMs = new Date(message.timestamp).getTime();
  const paddedTs = tsMs.toString().padStart(16, '0');
  return `${KEY_PREFIX}${channel}:${paddedTs}_${message.id}`;
}

function channelPrefix(channel: string): string {
  return `${KEY_PREFIX}${channel}:`;
}

function timestampFromKey(key: string, prefix: string): string {
  // Extract the padded timestamp portion: key is `{prefix}{paddedTs}_{id}`
  return key.slice(prefix.length, prefix.length + 16);
}

export class KVSSEBackend implements SSEBackend {
  readonly mode = 'poll' as const;

  constructor(private readonly kv: KVNamespace) {}

  async publish(channel: string, message: BroadcastMessage): Promise<void> {
    const key = makeKey(channel, message);
    await this.kv.put(key, JSON.stringify(message), { expirationTtl: TTL_SECONDS });
  }

  addConnection(_channel: string, _controller: SSEController): () => void {
    return () => {}; // No-op — poll mode doesn't track in-memory controllers
  }

  async poll(channel: string, since?: string): Promise<BroadcastMessage[]> {
    const prefix = channelPrefix(channel);
    const { keys } = await this.kv.list({ prefix });

    // Filter keys whose timestamp portion is strictly greater than `since`
    let filteredKeys = keys.map((k) => k.name);
    if (since) {
      const sinceMs = new Date(since).getTime();
      const sinceTs = sinceMs.toString().padStart(16, '0');
      filteredKeys = filteredKeys.filter((k) => timestampFromKey(k, prefix) > sinceTs);
    }

    if (filteredKeys.length === 0) return [];

    // Fetch all message values in parallel
    const results = await Promise.all(
      filteredKeys.map((key) => this.kv.get<BroadcastMessage>(key, 'json')),
    );

    return results.filter((m): m is BroadcastMessage => m !== null);
  }

  getConnectionCount(_channel: string): number {
    return 0; // Poll mode has no tracked in-memory connections
  }
}
