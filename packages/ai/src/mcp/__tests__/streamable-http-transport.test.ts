import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { McpStreamableHttpTransport } from '../transport/streamable-http';
import { McpInMemorySessionManager } from '../core/session';
import { McpRegistry } from '../core/registry';
import { McpNoAuth } from '../auth/mcp-auth';

const SERVER = 'test-http-transport';

function makeTransport(stateless = false) {
  const sessions = new McpInMemorySessionManager();
  const transport = new McpStreamableHttpTransport(SERVER, {} as any, new McpNoAuth(), stateless, sessions);
  return { transport, sessions };
}

function makePostRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('McpStreamableHttpTransport', () => {
  beforeEach(() => {
    McpRegistry.clear(SERVER);
  });

  // ─── Stateless Mode ───────────────────────────────────────────

  describe('stateless mode', () => {
    it('handles initialize without session', async () => {
      const { transport } = makeTransport(true);
      const req = makePostRequest({ method: 'initialize', id: 1 });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.result.protocolVersion).toBe('2024-11-05');
      expect(res.headers.get('Mcp-Session-Id')).toBeNull();
    });

    it('handles tools/call without session', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'echo',
        handler: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'hi' }] }),
      });
      const { transport } = makeTransport(true);
      const req = makePostRequest({
        method: 'tools/call',
        params: { name: 'echo', arguments: {} },
        id: 2,
      });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.result.content[0].text).toBe('hi');
    });
  });

  // ─── Stateful Mode ───────────────────────────────────────────

  describe('stateful mode', () => {
    it('creates session on initialize', async () => {
      const { transport } = makeTransport(false);
      const req = makePostRequest({ method: 'initialize', id: 1 });
      const res = await transport.handleRequest(req);
      const sessionId = res.headers.get('Mcp-Session-Id');
      expect(sessionId).toBeTruthy();
    });

    it('requires session for non-initialize requests', async () => {
      const { transport } = makeTransport(false);
      const req = makePostRequest({ method: 'tools/list', id: 2 });
      const res = await transport.handleRequest(req);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error.code).toBe('INVALID_SESSION');
    });

    it('accepts valid session header', async () => {
      const { transport, sessions } = makeTransport(false);
      await sessions.create('valid-sess');
      McpRegistry.registerTool(SERVER, { name: 't', handler: vi.fn() });

      const req = makePostRequest(
        { method: 'tools/list', id: 3 },
        { 'Mcp-Session-Id': 'valid-sess' },
      );
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.result.tools).toHaveLength(1);
    });
  });

  // ─── DELETE ───────────────────────────────────────────────────

  describe('DELETE', () => {
    it('deletes session and returns 204', async () => {
      const { transport, sessions } = makeTransport(false);
      await sessions.create('del-sess');
      const req = new Request('http://localhost/mcp', {
        method: 'DELETE',
        headers: { 'Mcp-Session-Id': 'del-sess' },
      });
      const res = await transport.handleRequest(req);
      expect(res.status).toBe(204);
      expect(await sessions.has('del-sess')).toBe(false);
    });
  });

  // ─── GET (SSE Stream) ─────────────────────────────────────────

  describe('GET', () => {
    it('returns 400 for invalid session', async () => {
      const { transport } = makeTransport(false);
      const req = new Request('http://localhost/mcp', {
        method: 'GET',
        headers: { 'Mcp-Session-Id': 'bad' },
      });
      const res = await transport.handleRequest(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── JSON-RPC Methods ────────────────────────────────────────

  describe('JSON-RPC methods', () => {
    it('handles resources/read', async () => {
      McpRegistry.registerResource(SERVER, {
        uri: 'file:///data.txt',
        name: 'Data',
        handler: vi.fn().mockResolvedValue({ contents: [{ uri: 'file:///data.txt', text: 'hello' }] }),
      });
      const { transport, sessions } = makeTransport(true);
      const req = makePostRequest({
        method: 'resources/read',
        params: { uri: 'file:///data.txt' },
        id: 10,
      });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.result.contents[0].text).toBe('hello');
    });

    it('handles resources/read error', async () => {
      const { transport } = makeTransport(true);
      const req = makePostRequest({
        method: 'resources/read',
        params: { uri: 'file:///missing' },
        id: 11,
      });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.error.code).toBe(-32603);
    });

    it('handles prompts/get', async () => {
      McpRegistry.registerPrompt(SERVER, {
        name: 'hello',
        handler: vi.fn().mockResolvedValue({
          messages: [{ role: 'user' as const, content: { type: 'text' as const, text: 'hi' } }],
        }),
      });
      const { transport } = makeTransport(true);
      const req = makePostRequest({
        method: 'prompts/get',
        params: { name: 'hello', arguments: {} },
        id: 12,
      });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.result.messages[0].content.text).toBe('hi');
    });

    it('handles prompts/get error', async () => {
      const { transport } = makeTransport(true);
      const req = makePostRequest({
        method: 'prompts/get',
        params: { name: 'missing' },
        id: 13,
      });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.error.code).toBe(-32603);
    });

    it('handles resources/templates/list', async () => {
      McpRegistry.registerResourceTemplate(SERVER, {
        uriTemplate: 'file:///{id}',
        name: 'Template',
        handler: vi.fn(),
      });
      const { transport } = makeTransport(true);
      const req = makePostRequest({ method: 'resources/templates/list', id: 14 });
      const res = await transport.handleRequest(req);
      const data = await res.json() as any;
      expect(data.result.resourceTemplates).toHaveLength(1);
    });

    it('returns error for invalid JSON', async () => {
      const { transport } = makeTransport(true);
      const req = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const res = await transport.handleRequest(req);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error.code).toBe('PARSE_ERROR');
    });
  });
});
