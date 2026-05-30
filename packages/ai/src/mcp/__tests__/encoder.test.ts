import { describe, it, expect } from 'vitest';
import { toSseStream, toNdjsonStream, createSseResponse, createJsonResponse, createMcpResponse } from '../transport/encoder';
import type { WireEvent } from '../core/types';

async function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

async function* yieldEvents(events: WireEvent[]): AsyncGenerator<WireEvent> {
  for (const e of events) yield e;
}

describe('Encoder', () => {
  // ─── toSseStream ──────────────────────────────────────────────

  describe('toSseStream()', () => {
    it('formats events as SSE frames', async () => {
      const events: WireEvent[] = [
        { type: 'ping', data: {} },
        { type: 'tools/list', data: { tools: [] } },
      ];
      const stream = toSseStream(yieldEvents(events));
      const output = await collectStream(stream);

      expect(output).toContain('event: ping\ndata: {}\n\n');
      expect(output).toContain('event: tools/list\ndata: {"tools":[]}\n\n');
    });

    it('handles errors by emitting error frame', async () => {
      async function* fail(): AsyncGenerator<WireEvent> {
        yield { type: 'ping', data: {} };
        throw new Error('stream-broke');
      }
      const stream = toSseStream(fail());
      const output = await collectStream(stream);

      expect(output).toContain('event: ping\ndata: {}\n\n');
      expect(output).toContain('event: error\ndata: {"code":"INTERNAL_ERROR","message":"stream-broke"}\n\n');
    });
  });

  // ─── toNdjsonStream ──────────────────────────────────────────

  describe('toNdjsonStream()', () => {
    it('formats events as NDJSON lines', async () => {
      const events: WireEvent[] = [
        { type: 'ping', data: {} },
        { type: 'session.created', data: { sessionId: 'abc' } },
      ];
      const stream = toNdjsonStream(yieldEvents(events));
      const output = await collectStream(stream);

      const lines = output.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ type: 'ping', data: {} });
      expect(JSON.parse(lines[1])).toEqual({ type: 'session.created', data: { sessionId: 'abc' } });
    });
  });

  // ─── Response Helpers ─────────────────────────────────────────

  describe('createSseResponse()', () => {
    it('sets correct SSE headers', () => {
      const body = new ReadableStream({ start(ctrl) { ctrl.close(); } });
      const res = createSseResponse(body);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
      expect(res.headers.get('Cache-Control')).toBe('no-cache');
      expect(res.headers.get('X-Accel-Buffering')).toBe('no');
    });
  });

  describe('createJsonResponse()', () => {
    it('sets JSON headers and status', async () => {
      const res = createJsonResponse({ error: 'nope' }, 400);
      expect(res.status).toBe(400);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      expect(await res.json()).toEqual({ error: 'nope' });
    });

    it('defaults to 200', () => {
      const res = createJsonResponse({ ok: true });
      expect(res.status).toBe(200);
    });
  });

  describe('createMcpResponse()', () => {
    it('includes Mcp-Session-Id header when provided', () => {
      const res = createMcpResponse({ jsonrpc: '2.0', result: {} }, 'sess-123');
      expect(res.headers.get('Mcp-Session-Id')).toBe('sess-123');
    });

    it('omits Mcp-Session-Id when not provided', () => {
      const res = createMcpResponse({ jsonrpc: '2.0', result: {} });
      expect(res.headers.get('Mcp-Session-Id')).toBeNull();
    });
  });
});
