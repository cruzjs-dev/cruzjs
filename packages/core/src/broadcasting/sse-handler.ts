/**
 * Server-Sent Events Handler
 *
 * Creates SSE streaming responses backed by an SSEBackend.
 *
 * - push mode (InMemorySSEBackend): direct controller delivery (single-instance)
 * - poll mode (KVSSEBackend, DatabaseSSEBackend): periodic polling from shared store
 *
 * The `sseRegistry` export is kept for backward compatibility and corresponds
 * to the default InMemorySSEBackend singleton.
 */

import type { SSEBackend, SSEController } from './sse-backend';
import { defaultSSEBackend, InMemorySSEBackend } from './sse-backend';

/** Default poll interval for poll-mode backends (milliseconds) */
const DEFAULT_POLL_INTERVAL_MS = 2000;

/**
 * Create an SSE streaming Response for a channel subscription.
 *
 * Push mode (InMemorySSEBackend): registers the controller and delivers
 * messages immediately when BroadcastService.publish() is called.
 *
 * Poll mode (KVSSEBackend, DatabaseSSEBackend): polls the backend every
 * `pollIntervalMs` ms and pushes new messages to the client.
 *
 * @param request     - Incoming Request (used to read Last-Event-ID header)
 * @param channel     - Channel name to subscribe to
 * @param options.backend          - SSE backend to use (defaults to defaultSSEBackend)
 * @param options.pollIntervalMs   - Poll interval for poll-mode backends (default 2000ms)
 * @param options.lastEventId      - Override Last-Event-ID (falls back to header)
 * @param options.userId           - User ID (for authorization / presence)
 */
export function createSSEResponse(
  request: Request,
  channel: string,
  options?: {
    backend?: SSEBackend;
    pollIntervalMs?: number;
    lastEventId?: string;
    userId?: string;
  },
): Response {
  const backend = options?.backend ?? defaultSSEBackend;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const lastEventId =
    options?.lastEventId ??
    request.headers.get('Last-Event-ID') ??
    undefined;

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let closed = false;
  let closeStream: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueueText = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Controller already closed
        }
      };

      // Send initial connection event
      enqueueText(`event: connected\ndata: ${JSON.stringify({ channel })}\n\n`);

      if (backend.mode === 'push') {
        // Push mode: register this controller; messages arrive via backend.publish()
        const wrapped: SSEController = { enqueue: enqueueText };
        cleanup = backend.addConnection(channel, wrapped);

        // Keep the stream open until cancel() is called
        await new Promise<void>((resolve) => {
          closeStream = resolve;
        });
      } else {
        // Poll mode: periodically ask the backend for new messages
        let since = lastEventId;

        const sleep = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));

        while (!closed) {
          await sleep(pollIntervalMs);
          if (closed) break;

          try {
            const messages = await backend.poll(channel, since);
            for (const msg of messages) {
              if (closed) break;
              enqueueText(
                `id: ${msg.id}\nevent: ${msg.event}\ndata: ${JSON.stringify(msg)}\n\n`,
              );
              since = msg.timestamp;
            }
          } catch {
            // Transient poll errors — keep the stream alive
          }
        }

        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },

    cancel() {
      closed = true;
      cleanup?.();
      closeStream?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Backward-compatible aliases.
 * SSEConnectionRegistry was the old in-memory class — use InMemorySSEBackend instead.
 */
export { InMemorySSEBackend as SSEConnectionRegistry, defaultSSEBackend as sseRegistry };
