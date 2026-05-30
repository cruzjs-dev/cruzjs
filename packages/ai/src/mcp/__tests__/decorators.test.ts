import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { McpTool, McpResource, McpResourceTemplate, McpPrompt, McpPublic, McpScopes, McpRoles, discoverCapabilities } from '../decorators/index';
import { McpRegistry } from '../core/registry';
import { z } from 'zod';
import type { McpContext, ToolResult, ResourceResult, PromptResult } from '../core/types';

const SERVER = 'test-decorators';

class FakeProvider {
  @McpTool({ name: 'echo', description: 'Echo input', parameters: z.object({ msg: z.string() }) })
  @McpPublic()
  async echo(args: { msg: string }, _ctx: McpContext): Promise<ToolResult> {
    return { content: [{ type: 'text', text: args.msg }] };
  }

  @McpTool({ name: 'admin_only', description: 'Admin only' })
  @McpRoles(['admin'])
  async adminOnly(_args: any, _ctx: McpContext): Promise<ToolResult> {
    return { content: [{ type: 'text', text: 'secret' }] };
  }

  @McpTool({ name: 'scoped', description: 'Scoped' })
  @McpScopes(['read:data'])
  async scoped(_args: any, _ctx: McpContext): Promise<ToolResult> {
    return { content: [{ type: 'text', text: 'data' }] };
  }

  @McpResource({ uri: 'file:///config.json', name: 'Config', mimeType: 'application/json' })
  async getConfig(_uri: string, _ctx: McpContext): Promise<ResourceResult> {
    return { contents: [{ uri: 'file:///config.json', text: '{}' }] };
  }

  @McpResourceTemplate({ uriTemplate: 'file:///users/{id}', name: 'UserFile', mimeType: 'text/plain' })
  async getUserFile(uri: string, _ctx: McpContext): Promise<ResourceResult> {
    return { contents: [{ uri, text: 'user-data' }] };
  }

  @McpPrompt({ name: 'summarize', description: 'Summarize', parameters: z.object({ text: z.string() }) })
  async summarize(args: { text: string }, _ctx: McpContext): Promise<PromptResult> {
    return { messages: [{ role: 'user', content: { type: 'text', text: args.text } }] };
  }

  // Not decorated — should not be discovered
  async helperMethod() {
    return 'not-a-capability';
  }
}

describe('MCP Decorators + discoverCapabilities', () => {
  let instance: FakeProvider;

  beforeEach(() => {
    McpRegistry.clear(SERVER);
    instance = new FakeProvider();
    discoverCapabilities(instance, FakeProvider, SERVER);
  });

  // ─── Tool Discovery ──────────────────────────────────────────

  describe('tool discovery', () => {
    it('discovers @McpTool decorated methods', () => {
      const echo = McpRegistry.getTool(SERVER, 'echo');
      expect(echo).toBeDefined();
      expect(echo!.description).toBe('Echo input');
      expect(echo!.parameters).toBeDefined();
    });

    it('discovers @McpPublic on tools', () => {
      const echo = McpRegistry.getTool(SERVER, 'echo');
      expect(echo!.isPublic).toBe(true);
    });

    it('discovers @McpRoles on tools', () => {
      const admin = McpRegistry.getTool(SERVER, 'admin_only');
      expect(admin!.requiredRoles).toEqual(['admin']);
    });

    it('discovers @McpScopes on tools', () => {
      const scoped = McpRegistry.getTool(SERVER, 'scoped');
      expect(scoped!.requiredScopes).toEqual(['read:data']);
    });

    it('does not discover undecorated methods', () => {
      expect(McpRegistry.getTool(SERVER, 'helperMethod')).toBeUndefined();
    });
  });

  // ─── Resource Discovery ──────────────────────────────────────

  describe('resource discovery', () => {
    it('discovers @McpResource decorated methods', () => {
      const resources = McpRegistry.getResources(SERVER);
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('file:///config.json');
      expect(resources[0].mimeType).toBe('application/json');
    });
  });

  // ─── Resource Template Discovery ─────────────────────────────

  describe('resource template discovery', () => {
    it('discovers @McpResourceTemplate decorated methods', () => {
      const templates = McpRegistry.getResourceTemplates(SERVER);
      expect(templates).toHaveLength(1);
      expect(templates[0].uriTemplate).toBe('file:///users/{id}');
    });
  });

  // ─── Prompt Discovery ────────────────────────────────────────

  describe('prompt discovery', () => {
    it('discovers @McpPrompt decorated methods', () => {
      const prompt = McpRegistry.getPrompt(SERVER, 'summarize');
      expect(prompt).toBeDefined();
      expect(prompt!.description).toBe('Summarize');
    });
  });

  // ─── Handler Invocation ──────────────────────────────────────

  describe('handler invocation', () => {
    it('tool handler calls through to instance method', async () => {
      const echo = McpRegistry.getTool(SERVER, 'echo');
      const result = await echo!.handler({ msg: 'hello' }, {} as McpContext);
      expect(result).toEqual({ content: [{ type: 'text', text: 'hello' }] });
    });

    it('resource handler calls through to instance method', async () => {
      const resource = McpRegistry.getResource(SERVER, 'file:///config.json');
      const result = await resource!.handler('file:///config.json', {} as McpContext);
      expect(result.contents[0].text).toBe('{}');
    });

    it('prompt handler calls through to instance method', async () => {
      const prompt = McpRegistry.getPrompt(SERVER, 'summarize');
      const result = await prompt!.handler({ text: 'some text' }, {} as McpContext);
      expect(result.messages[0].content).toEqual({ type: 'text', text: 'some text' });
    });
  });

  // ─── Provider Class Metadata ─────────────────────────────────

  describe('provider metadata', () => {
    it('stores providerClass and methodName', () => {
      const echo = McpRegistry.getTool(SERVER, 'echo');
      expect(echo!.providerClass).toBe(FakeProvider);
      expect(echo!.methodName).toBe('echo');
    });
  });
});
