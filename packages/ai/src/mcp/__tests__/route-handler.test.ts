import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { createMcpRouteHandler } from '../route-handler';
import { createMcpServer, getMcpServer, removeMcpServer } from '../di/module';
import { McpRegistry } from '../core/registry';

const SERVER = 'test-route-handler';

function makeContainer() {
  return {
    resolve: vi.fn(() => { throw new Error('not found'); }),
    isBound: vi.fn(() => false),
  } as any;
}

describe('createMcpRouteHandler', () => {
  let handler: ReturnType<typeof createMcpRouteHandler>;

  beforeEach(() => {
    McpRegistry.clear(SERVER);
    removeMcpServer(SERVER);
    createMcpServer({
      server: { name: SERVER, version: '1.0.0' },
      container: makeContainer(),
      transport: { type: 'streamable-http', statelessMode: true },
    });
    handler = createMcpRouteHandler({ serverId: SERVER });
  });

  afterEach(() => {
    McpRegistry.clear(SERVER);
    removeMcpServer(SERVER);
  });

  it('returns 404 for non-existent server', async () => {
    const missingHandler = createMcpRouteHandler({ serverId: 'nonexistent' });
    const res = await missingHandler.handle(new Request('http://localhost/mcp', { method: 'POST' }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect((data as any).error.code).toBe('NOT_FOUND');
  });

  it('delegates POST to streamable-http transport', async () => {
    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'initialize', id: 1 }),
    });
    const res = await handler.handle(req);
    const data = await res.json() as any;
    expect(data.result.protocolVersion).toBe('2024-11-05');
  });

  it('delegates GET to streamable-http transport (returns 400 for missing session)', async () => {
    const req = new Request('http://localhost/mcp', {
      method: 'GET',
      headers: { 'Mcp-Session-Id': 'invalid' },
    });
    const res = await handler.handle(req);
    expect(res.status).toBe(400);
  });

  it('delegates DELETE to streamable-http transport', async () => {
    const req = new Request('http://localhost/mcp', {
      method: 'DELETE',
      headers: { 'Mcp-Session-Id': 'any' },
    });
    const res = await handler.handle(req);
    expect(res.status).toBe(204);
  });
});
