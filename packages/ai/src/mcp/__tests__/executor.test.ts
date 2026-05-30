import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { McpExecutor } from '../core/executor';
import { McpRegistry } from '../core/registry';
import { z } from 'zod';

const SERVER = 'test-executor';

function makeExecutor(userId?: string, scopes?: string[], roles?: string[]) {
  return new McpExecutor(SERVER, {} as any, new Request('http://localhost'), userId, scopes, roles);
}

describe('McpExecutor', () => {
  beforeEach(() => {
    McpRegistry.clear(SERVER);
  });

  // ─── listTools ────────────────────────────────────────────────

  describe('listTools()', () => {
    it('returns empty array when no tools registered', () => {
      expect(makeExecutor().listTools()).toEqual([]);
    });

    it('returns tool definitions with inputSchema', () => {
      McpRegistry.registerTool(SERVER, {
        name: 'add',
        description: 'Add numbers',
        parameters: z.object({ a: z.number(), b: z.number() }),
        handler: vi.fn(),
      });
      const tools = makeExecutor().listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('add');
      expect(tools[0].description).toBe('Add numbers');
      expect(tools[0].inputSchema).toEqual({
        type: 'object',
        properties: { a: { type: 'number' }, b: { type: 'number' } },
        required: ['a', 'b'],
      });
    });

    it('returns default schema when no parameters', () => {
      McpRegistry.registerTool(SERVER, {
        name: 'ping',
        handler: vi.fn(),
      });
      const tools = makeExecutor().listTools();
      expect(tools[0].inputSchema).toEqual({ type: 'object', properties: {} });
    });
  });

  // ─── callTool ─────────────────────────────────────────────────

  describe('callTool()', () => {
    it('returns error for unknown tool', async () => {
      const result = await makeExecutor().callTool('nonexistent', {});
      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({ type: 'text', text: 'Unknown tool: nonexistent' });
    });

    it('calls handler with validated args', async () => {
      const handler = vi.fn().mockResolvedValue({
        content: [{ type: 'text' as const, text: '42' }],
      });
      McpRegistry.registerTool(SERVER, {
        name: 'add',
        parameters: z.object({ a: z.number(), b: z.number() }),
        handler,
      });

      const result = await makeExecutor().callTool('add', { a: 20, b: 22 });
      expect(handler).toHaveBeenCalledWith({ a: 20, b: 22 }, expect.objectContaining({
        container: expect.any(Object),
        request: expect.any(Request),
      }));
      expect(result.content[0]).toEqual({ type: 'text', text: '42' });
    });

    it('returns validation error for bad args', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'strict',
        parameters: z.object({ id: z.string().uuid() }),
        handler: vi.fn(),
      });

      const result = await makeExecutor().callTool('strict', { id: 'not-a-uuid' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Invalid arguments');
    });

    it('returns error when handler throws', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'boom',
        handler: vi.fn().mockRejectedValue(new Error('kaboom')),
      });

      const result = await makeExecutor().callTool('boom', {});
      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({ type: 'text', text: 'kaboom' });
    });

    it('returns generic message for non-Error throws', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'strange',
        handler: vi.fn().mockRejectedValue('string-error'),
      });

      const result = await makeExecutor().callTool('strange', {});
      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({ type: 'text', text: 'Tool execution failed' });
    });
  });

  // ─── Access Control ───────────────────────────────────────────

  describe('access control', () => {
    it('allows public tools without auth', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'public',
        isPublic: true,
        handler: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
      });

      const result = await makeExecutor().callTool('public', {});
      expect(result.isError).toBeUndefined();
    });

    it('allows tool when user has required scope', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'scoped',
        requiredScopes: ['read:data'],
        handler: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
      });

      const result = await makeExecutor(undefined, ['read:data']).callTool('scoped', {});
      expect(result.isError).toBeUndefined();
    });

    it('rejects when missing required scope', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'scoped',
        requiredScopes: ['admin:all'],
        handler: vi.fn(),
      });

      const result = await makeExecutor(undefined, ['read:data']).callTool('scoped', {});
      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Missing required scopes');
    });

    it('allows tool when user has required role', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'roled',
        requiredRoles: ['admin', 'owner'],
        handler: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
      });

      const result = await makeExecutor(undefined, undefined, ['admin']).callTool('roled', {});
      expect(result.isError).toBeUndefined();
    });

    it('rejects when missing required role', async () => {
      McpRegistry.registerTool(SERVER, {
        name: 'roled',
        requiredRoles: ['admin'],
        handler: vi.fn(),
      });

      const result = await makeExecutor(undefined, undefined, ['viewer']).callTool('roled', {});
      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Missing required role');
    });
  });

  // ─── Resources ────────────────────────────────────────────────

  describe('listResources()', () => {
    it('returns registered resources', () => {
      McpRegistry.registerResource(SERVER, {
        uri: 'file:///data.csv',
        name: 'Data',
        description: 'CSV data',
        mimeType: 'text/csv',
        handler: vi.fn(),
      });

      const resources = makeExecutor().listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0]).toEqual({
        uri: 'file:///data.csv',
        name: 'Data',
        description: 'CSV data',
        mimeType: 'text/csv',
      });
    });
  });

  describe('readResource()', () => {
    it('reads a static resource by exact uri', async () => {
      McpRegistry.registerResource(SERVER, {
        uri: 'file:///hello.txt',
        name: 'Hello',
        handler: vi.fn().mockResolvedValue({
          contents: [{ uri: 'file:///hello.txt', text: 'Hello world' }],
        }),
      });

      const result = await makeExecutor().readResource('file:///hello.txt');
      expect(result.contents[0].text).toBe('Hello world');
    });

    it('matches resource templates with dynamic segments', async () => {
      McpRegistry.registerResourceTemplate(SERVER, {
        uriTemplate: 'file:///users/{id}/profile',
        name: 'UserProfile',
        handler: vi.fn().mockResolvedValue({
          contents: [{ uri: 'matched', text: 'profile-data' }],
        }),
      });

      const result = await makeExecutor().readResource('file:///users/42/profile');
      expect(result.contents[0].text).toBe('profile-data');
    });

    it('throws when no resource or template matches', async () => {
      await expect(makeExecutor().readResource('file:///missing')).rejects.toThrow('Resource not found');
    });
  });

  describe('listResourceTemplates()', () => {
    it('returns registered templates', () => {
      McpRegistry.registerResourceTemplate(SERVER, {
        uriTemplate: 'file:///{category}/{id}',
        name: 'CategoryItem',
        description: 'Items by category',
        mimeType: 'application/json',
        handler: vi.fn(),
      });

      const templates = makeExecutor().listResourceTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].uriTemplate).toBe('file:///{category}/{id}');
    });
  });

  // ─── Prompts ──────────────────────────────────────────────────

  describe('listPrompts()', () => {
    it('returns registered prompts', () => {
      McpRegistry.registerPrompt(SERVER, {
        name: 'summarize',
        description: 'Summarize text',
        handler: vi.fn(),
      });

      const prompts = makeExecutor().listPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toEqual({ name: 'summarize', description: 'Summarize text' });
    });
  });

  describe('getPrompt()', () => {
    it('calls handler with validated args', async () => {
      McpRegistry.registerPrompt(SERVER, {
        name: 'greet',
        parameters: z.object({ name: z.string() }),
        handler: vi.fn().mockResolvedValue({
          messages: [{ role: 'user', content: { type: 'text', text: 'Hello!' } }],
        }),
      });

      const result = await makeExecutor().getPrompt('greet', { name: 'World' });
      expect(result.messages[0].content).toEqual({ type: 'text', text: 'Hello!' });
    });

    it('throws for unknown prompt', async () => {
      await expect(makeExecutor().getPrompt('missing', {})).rejects.toThrow('Prompt not found');
    });

    it('throws for invalid args', async () => {
      McpRegistry.registerPrompt(SERVER, {
        name: 'strict-prompt',
        parameters: z.object({ count: z.number().min(1) }),
        handler: vi.fn(),
      });

      await expect(makeExecutor().getPrompt('strict-prompt', { count: -1 })).rejects.toThrow('Invalid arguments');
    });
  });

  // ─── Zod to JSON Schema ───────────────────────────────────────

  describe('zodToJsonSchema (via listTools)', () => {
    it('converts ZodString', () => {
      McpRegistry.registerTool(SERVER, {
        name: 's',
        parameters: z.object({ name: z.string() }),
        handler: vi.fn(),
      });
      const schema = makeExecutor().listTools()[0].inputSchema;
      expect(schema).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      });
    });

    it('converts ZodBoolean', () => {
      McpRegistry.registerTool(SERVER, {
        name: 'b',
        parameters: z.object({ flag: z.boolean() }),
        handler: vi.fn(),
      });
      const schema = makeExecutor().listTools()[0].inputSchema;
      expect(schema.properties.flag).toEqual({ type: 'boolean' });
    });

    it('converts ZodArray', () => {
      McpRegistry.registerTool(SERVER, {
        name: 'arr',
        parameters: z.object({ items: z.array(z.string()) }),
        handler: vi.fn(),
      });
      const schema = makeExecutor().listTools()[0].inputSchema;
      expect(schema.properties.items).toEqual({ type: 'array', items: { type: 'string' } });
    });

    it('converts ZodEnum', () => {
      McpRegistry.registerTool(SERVER, {
        name: 'e',
        parameters: z.object({ color: z.enum(['red', 'green', 'blue']) }),
        handler: vi.fn(),
      });
      const schema = makeExecutor().listTools()[0].inputSchema;
      expect(schema.properties.color).toEqual({ type: 'string', enum: ['red', 'green', 'blue'] });
    });

    it('converts ZodOptional', () => {
      McpRegistry.registerTool(SERVER, {
        name: 'opt',
        parameters: z.object({ maybe: z.string().optional() }),
        handler: vi.fn(),
      });
      const schema = makeExecutor().listTools()[0].inputSchema;
      expect(schema.required).toBeUndefined();
      expect(schema.properties.maybe).toEqual({ type: 'string' });
    });
  });
});
