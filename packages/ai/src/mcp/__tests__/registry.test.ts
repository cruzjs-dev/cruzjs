import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { McpRegistry } from '../core/registry';

const SERVER = 'test-registry';

describe('McpRegistry', () => {
  beforeEach(() => {
    McpRegistry.clear(SERVER);
  });

  // ─── Tools ────────────────────────────────────────────────────

  describe('registerTool / getTool / getTools', () => {
    it('registers and retrieves a tool', () => {
      const tool = { name: 'echo', handler: vi.fn() };
      McpRegistry.registerTool(SERVER, tool as any);
      expect(McpRegistry.getTool(SERVER, 'echo')).toBe(tool);
    });

    it('returns undefined for unknown tool', () => {
      expect(McpRegistry.getTool(SERVER, 'missing')).toBeUndefined();
    });

    it('returns all tools as array', () => {
      McpRegistry.registerTool(SERVER, { name: 'a', handler: vi.fn() } as any);
      McpRegistry.registerTool(SERVER, { name: 'b', handler: vi.fn() } as any);
      expect(McpRegistry.getTools(SERVER)).toHaveLength(2);
    });

    it('overwrites tool with same name', () => {
      const v1 = { name: 'dup', handler: vi.fn() } as any;
      const v2 = { name: 'dup', handler: vi.fn() } as any;
      McpRegistry.registerTool(SERVER, v1);
      McpRegistry.registerTool(SERVER, v2);
      expect(McpRegistry.getTool(SERVER, 'dup')).toBe(v2);
      expect(McpRegistry.getTools(SERVER)).toHaveLength(1);
    });
  });

  describe('removeTool', () => {
    it('removes a tool and returns true', () => {
      McpRegistry.registerTool(SERVER, { name: 'rm', handler: vi.fn() } as any);
      expect(McpRegistry.removeTool(SERVER, 'rm')).toBe(true);
      expect(McpRegistry.getTool(SERVER, 'rm')).toBeUndefined();
    });

    it('returns false for non-existent tool', () => {
      expect(McpRegistry.removeTool(SERVER, 'ghost')).toBe(false);
    });
  });

  // ─── Resources ────────────────────────────────────────────────

  describe('registerResource / getResource / getResources', () => {
    it('registers and retrieves a resource by uri', () => {
      const resource = { uri: 'file:///test.txt', name: 'Test', handler: vi.fn() };
      McpRegistry.registerResource(SERVER, resource as any);
      expect(McpRegistry.getResource(SERVER, 'file:///test.txt')).toBe(resource);
    });

    it('returns all resources', () => {
      McpRegistry.registerResource(SERVER, { uri: 'a', name: 'A', handler: vi.fn() } as any);
      McpRegistry.registerResource(SERVER, { uri: 'b', name: 'B', handler: vi.fn() } as any);
      expect(McpRegistry.getResources(SERVER)).toHaveLength(2);
    });
  });

  // ─── Resource Templates ───────────────────────────────────────

  describe('registerResourceTemplate / getResourceTemplates', () => {
    it('registers and lists templates', () => {
      const tmpl = { uriTemplate: 'file:///{name}', name: 'Dynamic', handler: vi.fn() };
      McpRegistry.registerResourceTemplate(SERVER, tmpl as any);
      expect(McpRegistry.getResourceTemplates(SERVER)).toHaveLength(1);
      expect(McpRegistry.getResourceTemplates(SERVER)[0].uriTemplate).toBe('file:///{name}');
    });
  });

  // ─── Prompts ──────────────────────────────────────────────────

  describe('registerPrompt / getPrompt / getPrompts', () => {
    it('registers and retrieves a prompt by name', () => {
      const prompt = { name: 'greet', handler: vi.fn() };
      McpRegistry.registerPrompt(SERVER, prompt as any);
      expect(McpRegistry.getPrompt(SERVER, 'greet')).toBe(prompt);
    });

    it('removes a prompt', () => {
      McpRegistry.registerPrompt(SERVER, { name: 'bye', handler: vi.fn() } as any);
      expect(McpRegistry.removePrompt(SERVER, 'bye')).toBe(true);
      expect(McpRegistry.getPrompt(SERVER, 'bye')).toBeUndefined();
    });
  });

  // ─── Isolation ────────────────────────────────────────────────

  describe('server isolation', () => {
    it('separates registries per serverId', () => {
      const OTHER = 'other-server';
      McpRegistry.registerTool(SERVER, { name: 'only-here', handler: vi.fn() } as any);
      expect(McpRegistry.getTool(SERVER, 'only-here')).toBeDefined();
      expect(McpRegistry.getTool(OTHER, 'only-here')).toBeUndefined();
      McpRegistry.clear(OTHER);
    });
  });

  describe('clear', () => {
    it('removes all capabilities for a server', () => {
      McpRegistry.registerTool(SERVER, { name: 't', handler: vi.fn() } as any);
      McpRegistry.registerResource(SERVER, { uri: 'r', name: 'R', handler: vi.fn() } as any);
      McpRegistry.registerPrompt(SERVER, { name: 'p', handler: vi.fn() } as any);
      McpRegistry.clear(SERVER);
      expect(McpRegistry.getTools(SERVER)).toHaveLength(0);
      expect(McpRegistry.getResources(SERVER)).toHaveLength(0);
      expect(McpRegistry.getPrompts(SERVER)).toHaveLength(0);
    });
  });
});
