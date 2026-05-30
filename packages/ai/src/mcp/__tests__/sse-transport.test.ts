import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { McpSseTransport } from '../transport/sse';
import { McpInMemorySessionManager } from '../core/session';
import { McpRegistry } from '../core/registry';
import { McpNoAuth } from '../auth/mcp-auth';

const SERVER = 'test-sse-transport';

function makeTransport(pingMs = 0) {
  const sessions = new McpInMemorySessionManager();
  const transport = new McpSseTransport(SERVER, {} as any, new McpNoAuth(), pingMs, sessions);
  return { transport, sessions };
}

function makeMessageRequest(sessionId: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/mcp/messages?sessionId=${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('McpSseTransport', () => {
  beforeEach(() => {
    McpRegistry.clear(SERVER);
  });

  // ─── SSE Connect ──────────────────────────────────────────────

  describe('handleSseConnect()', () => {
    it('returns SSE response with session.created event', async () => {
      const { transport } = makeTransport();
      const res = await transport.handleSseConnect(new Request('http://localhost/mcp/sse'));

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    });
  });

  // ─── Message Handling ─────────────────────────────────────────

  describe('handleMessage()', () => {
    it('returns 400 for missing sessionId', async () => {
      const { transport } = makeTransport();
      const req = new Request('http://localhost/mcp/messages', {
        method: 'POST',
        body: JSON.stringify({ method: 'ping', id: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await transport.handleMessage(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect((data as any).error.code).toBe('INVALID_SESSION');
    });

    it('returns 400 for invalid sessionId', async () => {
      const { transport } = makeTransport();
      const req = makeMessageRequest('nonexistent', { method: 'ping', id: 1 });
      const res = await transport.handleMessage(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON', async () => {
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-1');
      const req = new Request(`http://localhost/mcp/messages?sessionId=sess-1`, {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await transport.handleMessage(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect((data as any).error.code).toBe('PARSE_ERROR');
    });

    it('handles initialize', async () => {
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-init');
      const req = makeMessageRequest('sess-init', { method: 'initialize', id: 1 });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.result.protocolVersion).toBe('2024-11-05');
      expect(data.result.capabilities.tools.listChanged).toBe(true);
      expect(res.headers.get('Mcp-Session-Id')).toBe('sess-init');
    });

    it('handles ping', async () => {
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-ping');
      const req = makeMessageRequest('sess-ping', { method: 'ping', id: 2 });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.result).toEqual({});
    });

    it('handles tools/list', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'test-tool',
        description: 'A test',
        handler: vi.fn(),
      });
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-tools');
      const req = makeMessageRequest('sess-tools', { method: 'tools/list', id: 3 });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.result.tools).toHaveLength(1);
      expect(data.result.tools[0].name).toBe('test-tool');
    });

    it('handles tools/call', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'echo',
        handler: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'hello' }] }),
      });
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-call');
      const req = makeMessageRequest('sess-call', {
        method: 'tools/call',
        params: { name: 'echo', arguments: {} },
        id: 4,
      });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.result.content[0].text).toBe('hello');
    });

    it('handles resources/list', async () => {
      McpRegistry.registerResource(SERVER, {
        uri: 'file:///test.txt',
        name: 'Test',
        handler: vi.fn(),
      });
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-res');
      const req = makeMessageRequest('sess-res', { method: 'resources/list', id: 5 });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.result.resources).toHaveLength(1);
    });

    it('handles prompts/list', async () => {
      McpRegistry.registerPrompt(SERVER, {
        name: 'greet',
        handler: vi.fn(),
      });
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-prompt');
      const req = makeMessageRequest('sess-prompt', { method: 'prompts/list', id: 6 });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.result.prompts).toHaveLength(1);
    });

    it('handles unknown methods', async () => {
      const { transport, sessions } = makeTransport();
      await sessions.create('sess-unknown');
      const req = makeMessageRequest('sess-unknown', { method: 'nonexistent/method', id: 99 });
      const res = await transport.handleMessage(req);
      const data = await res.json() as any;
      expect(data.error.code).toBe(-32601);
    });
  });

  // ─── Lifecycle ────────────────────────────────────────────────

  describe('start/stop', () => {
    it('start does nothing with pingMs=0', () => {
      const { transport } = makeTransport(0);
      expect(() => transport.start()).not.toThrow();
    });

    it('stop cleans up cleanly', () => {
      const { transport } = makeTransport();
      transport.start();
      expect(() => transport.stop()).not.toThrow();
    });
  });
});
