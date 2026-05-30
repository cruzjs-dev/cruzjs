import type { WireEvent, WireError } from '../core/types';

export function toSseStream(events: AsyncIterable<WireEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          const frame = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        }
        controller.close();
      } catch (err) {
        const errorFrame = `event: error\ndata: ${JSON.stringify(serializeError(err))}\n\n`;
        controller.enqueue(encoder.encode(errorFrame));
        controller.close();
      }
    },
  });
}

export function toNdjsonStream(events: AsyncIterable<WireEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: event.type, data: event.data }) + '\n'));
        }
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', data: serializeError(err) }) + '\n'));
        controller.close();
      }
    },
  });
}

export async function* sseResponse(eventStream: AsyncIterable<WireEvent>): AsyncGenerator<WireEvent> {
  yield* eventStream;
}

export function createSseResponse(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createMcpResponse(data: unknown, sessionId?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }
  return new Response(JSON.stringify(data), { status: 200, headers });
}

function serializeError(err: unknown): WireError {
  if (err instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: err.message };
  }
  return { code: 'INTERNAL_ERROR', message: String(err) };
}
