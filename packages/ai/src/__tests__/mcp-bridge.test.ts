import { describe, it, expect, vi } from 'vitest';
import { McpBridge } from '../mcp-bridge';
import type { IAIProvider, AIMessage, AIResponse, ModelOptions } from '../providers/provider.interface';

function createMockProvider(chatFn: IAIProvider['chat']): IAIProvider {
  return {
    name: 'mock-provider',
    chat: chatFn,
    stream: vi.fn() as unknown as IAIProvider['stream'],
    embed: vi.fn(),
  };
}

describe('McpBridge', () => {
  describe('toToolDef()', () => {
    it('maps name, description, and inputSchema', () => {
      const result = McpBridge.toToolDef({
        name: 'getWeather',
        description: 'Get weather for a city',
        inputSchema: {
          type: 'object',
          properties: {
            city: { type: 'string' },
          },
        },
      });

      expect(result).toEqual({
        name: 'getWeather',
        description: 'Get weather for a city',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string' },
          },
        },
      });
    });

    it('defaults parameters to empty object when inputSchema is undefined', () => {
      const result = McpBridge.toToolDef({
        name: 'listItems',
        description: 'List all items',
      });

      expect(result).toEqual({
        name: 'listItems',
        description: 'List all items',
        parameters: {},
      });
    });
  });

  describe('runWithTools()', () => {
    it('returns immediately when no tool calls', async () => {
      const chatFn = vi.fn<IAIProvider['chat']>().mockResolvedValue({
        content: 'Hello!',
        toolCalls: [],
      });
      const provider = createMockProvider(chatFn);
      const messages: AIMessage[] = [{ role: 'user', content: 'Hi' }];

      const result = await McpBridge.runWithTools(provider, messages, {
        executor: vi.fn(),
      });

      expect(result.content).toBe('Hello!');
      expect(result.rounds).toBe(1);
      expect(chatFn).toHaveBeenCalledOnce();
    });

    it('returns immediately when toolCalls is undefined', async () => {
      const chatFn = vi.fn<IAIProvider['chat']>().mockResolvedValue({
        content: 'No tools here',
      });
      const provider = createMockProvider(chatFn);
      const messages: AIMessage[] = [{ role: 'user', content: 'Hi' }];

      const result = await McpBridge.runWithTools(provider, messages, {
        executor: vi.fn(),
      });

      expect(result.content).toBe('No tools here');
      expect(result.rounds).toBe(1);
    });

    it('executes tool calls and appends results for second round', async () => {
      const chatFn = vi.fn<IAIProvider['chat']>();

      // First call: returns a tool call
      chatFn.mockResolvedValueOnce({
        content: 'Let me check the weather',
        toolCalls: [
          { id: 'call_1', name: 'getWeather', arguments: { city: 'NYC' } },
        ],
      });

      // Second call: returns final answer (no tool calls)
      chatFn.mockResolvedValueOnce({
        content: 'The weather in NYC is sunny!',
        toolCalls: [],
      });

      const provider = createMockProvider(chatFn);
      const executor = vi.fn().mockResolvedValue('sunny, 72F');
      const messages: AIMessage[] = [{ role: 'user', content: 'What is the weather in NYC?' }];

      const result = await McpBridge.runWithTools(provider, messages, { executor });

      expect(result.content).toBe('The weather in NYC is sunny!');
      expect(result.rounds).toBe(2);
      expect(executor).toHaveBeenCalledOnce();
      expect(executor).toHaveBeenCalledWith({
        id: 'call_1',
        name: 'getWeather',
        arguments: { city: 'NYC' },
      });

      // Verify the second chat() call includes the tool result
      const secondCallMessages = chatFn.mock.calls[1][0];
      expect(secondCallMessages).toHaveLength(3); // original + assistant + tool result
      expect(secondCallMessages[1]).toEqual({
        role: 'assistant',
        content: 'Let me check the weather',
      });
      expect(secondCallMessages[2]).toEqual({
        role: 'tool',
        content: 'sunny, 72F',
        toolCallId: 'call_1',
        name: 'getWeather',
      });
    });

    it('respects maxRounds and stops after the limit', async () => {
      // Simulate an infinite tool-call loop
      const chatFn = vi.fn<IAIProvider['chat']>().mockResolvedValue({
        content: 'Calling tool again...',
        toolCalls: [
          { id: 'call_loop', name: 'loopTool', arguments: {} },
        ],
      });

      const provider = createMockProvider(chatFn);
      const executor = vi.fn().mockResolvedValue('result');
      const messages: AIMessage[] = [{ role: 'user', content: 'Loop forever' }];

      const result = await McpBridge.runWithTools(provider, messages, {
        executor,
        maxRounds: 2,
      });

      expect(result.rounds).toBe(2);
      expect(chatFn).toHaveBeenCalledTimes(2);
      expect(executor).toHaveBeenCalledTimes(2);
      expect(result.content).toBe('Calling tool again...');
    });

    it('returns empty string when maxRounds reached with no assistant messages', async () => {
      // Edge case: provider returns tool calls but no content, and we hit max
      const chatFn = vi.fn<IAIProvider['chat']>().mockResolvedValue({
        content: '',
        toolCalls: [
          { id: 'call_x', name: 'someTool', arguments: {} },
        ],
      });

      const provider = createMockProvider(chatFn);
      const executor = vi.fn().mockResolvedValue('done');

      // Use only 1 message so there are no prior assistant messages
      const messages: AIMessage[] = [{ role: 'user', content: 'Go' }];

      const result = await McpBridge.runWithTools(provider, messages, {
        executor,
        maxRounds: 1,
      });

      // The last assistant message has empty content
      expect(result.content).toBe('');
      expect(result.rounds).toBe(1);
    });

    it('handles multiple tool calls in a single round', async () => {
      const chatFn = vi.fn<IAIProvider['chat']>();

      chatFn.mockResolvedValueOnce({
        content: 'Checking both...',
        toolCalls: [
          { id: 'call_a', name: 'toolA', arguments: { x: 1 } },
          { id: 'call_b', name: 'toolB', arguments: { y: 2 } },
        ],
      });

      chatFn.mockResolvedValueOnce({
        content: 'Done with both tools',
        toolCalls: [],
      });

      const provider = createMockProvider(chatFn);
      const executor = vi.fn()
        .mockResolvedValueOnce('resultA')
        .mockResolvedValueOnce('resultB');

      const messages: AIMessage[] = [{ role: 'user', content: 'Do two things' }];

      const result = await McpBridge.runWithTools(provider, messages, { executor });

      expect(result.content).toBe('Done with both tools');
      expect(result.rounds).toBe(2);
      expect(executor).toHaveBeenCalledTimes(2);

      // Both tool results should be in the second call
      const secondCallMessages = chatFn.mock.calls[1][0];
      expect(secondCallMessages).toHaveLength(4); // original + assistant + 2 tool results
    });

    it('does not mutate the original messages array', async () => {
      const chatFn = vi.fn<IAIProvider['chat']>().mockResolvedValue({
        content: 'Hello',
        toolCalls: [],
      });

      const provider = createMockProvider(chatFn);
      const messages: AIMessage[] = [{ role: 'user', content: 'Hi' }];
      const originalLength = messages.length;

      await McpBridge.runWithTools(provider, messages, { executor: vi.fn() });

      expect(messages).toHaveLength(originalLength);
    });
  });
});
