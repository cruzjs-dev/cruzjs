import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { createMcpServer, getMcpServer, registerMcpProviders, removeMcpServer } from '../di/module';
import { McpRegistry } from '../core/registry';
import { McpTool, discoverCapabilities } from '../decorators/index';
import type { McpContext, ToolResult } from '../core/types';
import type { CruzContainer } from '@cruzjs/core/di';

const SERVER = 'test-module';

function makeContainer(): CruzContainer {
  return {
    resolve: vi.fn(() => { throw new Error('not found'); }),
    isBound: vi.fn(() => false),
  } as any;
}

describe('createMcpServer', () => {
  beforeEach(() => {
    McpRegistry.clear(SERVER);
    removeMcpServer(SERVER);
  });

  afterEach(() => {
    McpRegistry.clear(SERVER);
    removeMcpServer(SERVER);
  });

  it('creates an SSE server', () => {
    createMcpServer({
      server: { name: SERVER, version: '1.0.0' },
      container: makeContainer(),
      transport: { type: 'sse' },
      auth: { type: 'none' },
    });
    const server = getMcpServer(SERVER);
    expect(server).toBeDefined();
    expect(server!.config.server.name).toBe(SERVER);
  });

  it('creates a streamable-http server', () => {
    const id = 'http-test';
    createMcpServer({
      server: { name: id, version: '1.0.0' },
      container: makeContainer(),
      transport: { type: 'streamable-http', statelessMode: true },
      auth: { type: 'none' },
    });
    expect(getMcpServer(id)).toBeDefined();
    McpRegistry.clear(id);
  });

  it('throws on duplicate server name', () => {
    createMcpServer({
      server: { name: SERVER, version: '1.0.0' },
      container: makeContainer(),
      transport: { type: 'sse' },
    });
    expect(() =>
      createMcpServer({
        server: { name: SERVER, version: '2.0.0' },
        container: makeContainer(),
        transport: { type: 'streamable-http' },
      }),
    ).toThrow(`MCP server "${SERVER}" already exists`);
  });
});

describe('getMcpServer', () => {
  it('returns undefined for non-existent server', () => {
    expect(getMcpServer('nope')).toBeUndefined();
  });
});

describe('registerMcpProviders', () => {
  it('discovers decorated providers via container.resolve', () => {
    const SERVER_P = 'provider-test';

    class MyProvider {
      @McpTool({ name: 'my-tool', description: 'Test tool' })
      async myTool(_args: any, _ctx: McpContext): Promise<ToolResult> {
        return { content: [{ type: 'text', text: 'ok' }] };
      }
    }

    const container = {
      resolve: vi.fn().mockReturnValue(new MyProvider()),
      isBound: vi.fn(() => false),
    } as any;

    createMcpServer({
      server: { name: SERVER_P, version: '1.0.0' },
      container,
      transport: { type: 'streamable-http', statelessMode: true },
    });

    registerMcpProviders(SERVER_P, container, [MyProvider]);

    expect(McpRegistry.getTool(SERVER_P, 'my-tool')).toBeDefined();
    expect(container.resolve).toHaveBeenCalledWith(MyProvider);
    McpRegistry.clear(SERVER_P);
  });

  it('falls back to direct instantiation when resolve fails', () => {
    const SERVER_F = 'fallback-test';

    class SimpleProvider {
      @McpTool({ name: 'simple', description: 'Simple' })
      async simple(_args: any, _ctx: McpContext): Promise<ToolResult> {
        return { content: [{ type: 'text', text: 'ok' }] };
      }
    }

    const container = {
      resolve: vi.fn(() => { throw new Error('nope'); }),
      isBound: vi.fn(() => false),
    } as any;

    createMcpServer({
      server: { name: SERVER_F, version: '1.0.0' },
      container,
      transport: { type: 'streamable-http', statelessMode: true },
    });

    registerMcpProviders(SERVER_F, container, [SimpleProvider]);
    expect(McpRegistry.getTool(SERVER_F, 'simple')).toBeDefined();
    McpRegistry.clear(SERVER_F);
  });
});
