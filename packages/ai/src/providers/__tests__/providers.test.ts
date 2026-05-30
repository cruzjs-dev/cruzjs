import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { CloudflareGatewayProvider } from '../cloudflare-gateway';
import { OpenAIProvider } from '../openai';
import { AnthropicProvider } from '../anthropic';
import { OpenRouterProvider } from '../openrouter';
import { AIProviderRegistry } from '../registry';
import type { AIMessage, IAIProvider, AIResponse } from '../provider.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createSSEResponse(chunks: string[]): Response {
  const encoded = new TextEncoder().encode(
    chunks.map((c) => `data: ${c}\n\n`).join(''),
  );
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

const testMessages: AIMessage[] = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello' },
];

// ---------------------------------------------------------------------------
// CloudflareGatewayProvider
// ---------------------------------------------------------------------------

describe('CloudflareGatewayProvider', () => {
  let provider: CloudflareGatewayProvider;

  beforeEach(() => {
    provider = new CloudflareGatewayProvider({
      accountId: 'test-account',
      gatewayId: 'test-gateway',
      apiKey: 'test-key',
      defaultModel: 'gpt-4o-mini',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('cloudflare-gateway');
  });

  it('chat() calls correct URL with auth header', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );

    const result = await provider.chat(testMessages);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      'https://gateway.ai.cloudflare.com/v1/test-account/test-gateway/openai/chat/completions',
    );
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer test-key');
    expect(result.content).toBe('Hello!');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });

  it('chat() sends model and temperature', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        choices: [{ message: { content: 'OK' } }],
      }),
    );

    await provider.chat(testMessages, { model: 'gpt-4o', temperature: 0.5 });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0.5);
  });

  it('chat() throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(provider.chat(testMessages)).rejects.toThrow(
      'Cloudflare Gateway returned 401',
    );
  });

  it('chat() parses tool calls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        choices: [{
          message: {
            content: '',
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: { name: 'getWeather', arguments: '{"city":"NYC"}' },
            }],
          },
        }],
      }),
    );

    const result = await provider.chat(testMessages);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].name).toBe('getWeather');
    expect(result.toolCalls![0].arguments).toEqual({ city: 'NYC' });
  });

  it('stream() yields chunks and terminates with done: true', async () => {
    const sseChunks = [
      JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
      JSON.stringify({ choices: [{ delta: { content: ' world' } }] }),
      '[DONE]',
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createSSEResponse(sseChunks));

    const chunks: string[] = [];
    let gotDone = false;

    for await (const chunk of provider.stream(testMessages)) {
      if (chunk.done) {
        gotDone = true;
      } else if (chunk.chunk) {
        chunks.push(chunk.chunk);
      }
    }

    expect(chunks).toEqual(['Hello', ' world']);
    expect(gotDone).toBe(true);
  });

  it('embed() calls the embeddings endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
      }),
    );

    const result = await provider.embed(['hello', 'world']);

    expect(fetchSpy.mock.calls[0][0]).toContain('/openai/embeddings');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([0.1, 0.2, 0.3]);
  });
});

// ---------------------------------------------------------------------------
// OpenAIProvider
// ---------------------------------------------------------------------------

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'sk-test',
      defaultModel: 'gpt-4o-mini',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('chat() calls the OpenAI API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 8, completion_tokens: 3 },
      }),
    );

    const result = await provider.chat(testMessages);

    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
    expect((fetchSpy.mock.calls[0][1]?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer sk-test',
    );
    expect(result.content).toBe('Response');
  });

  it('chat() supports custom base URL', async () => {
    const customProvider = new OpenAIProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://my-proxy.example.com/v1',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        choices: [{ message: { content: 'OK' } }],
      }),
    );

    await customProvider.chat(testMessages);

    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://my-proxy.example.com/v1/chat/completions',
    );
  });

  it('stream() yields chunks and terminates with done: true', async () => {
    const sseChunks = [
      JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] }),
      JSON.stringify({ choices: [{ delta: { content: '!' }, finish_reason: 'stop' }] }),
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createSSEResponse(sseChunks));

    const chunks: string[] = [];
    let gotDone = false;

    for await (const chunk of provider.stream(testMessages)) {
      if (chunk.done) {
        gotDone = true;
      } else if (chunk.chunk) {
        chunks.push(chunk.chunk);
      }
    }

    expect(chunks).toEqual(['Hi', '!']);
    expect(gotDone).toBe(true);
  });

  it('embed() returns embedding vectors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        data: [{ embedding: [1, 2, 3] }],
      }),
    );

    const result = await provider.embed(['test']);
    expect(result).toEqual([[1, 2, 3]]);
  });
});

// ---------------------------------------------------------------------------
// AnthropicProvider
// ---------------------------------------------------------------------------

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: 'sk-ant-test',
      defaultModel: 'claude-sonnet-4-20250514',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('anthropic');
  });

  it('chat() calls the Anthropic Messages API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        content: [{ type: 'text', text: 'Hello from Claude' }],
        usage: { input_tokens: 12, output_tokens: 4 },
      }),
    );

    const result = await provider.chat(testMessages);

    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');

    expect(result.content).toBe('Hello from Claude');
    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(4);
  });

  it('chat() maps response with tool calls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        content: [
          { type: 'text', text: 'Let me check' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'search',
            input: { query: 'weather' },
          },
        ],
        usage: { input_tokens: 10, output_tokens: 8 },
      }),
    );

    const result = await provider.chat(testMessages);

    expect(result.content).toBe('Let me check');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].name).toBe('search');
    expect(result.toolCalls![0].arguments).toEqual({ query: 'weather' });
  });

  it('chat() extracts system message from AIMessage array', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 5, output_tokens: 1 },
      }),
    );

    await provider.chat([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'Hi' },
    ]);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.system).toBe('Be brief.');
    // System message should NOT be in the messages array
    expect(body.messages).toEqual([
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('embed() throws an error', async () => {
    await expect(provider.embed(['test'])).rejects.toThrow(
      'Anthropic does not support embeddings',
    );
  });

  it('stream() yields text chunks from content_block_delta events', async () => {
    const sseChunks = [
      JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' there' } }),
      JSON.stringify({ type: 'content_block_stop', index: 0 }),
      JSON.stringify({ type: 'message_stop' }),
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createSSEResponse(sseChunks));

    const chunks: string[] = [];
    let gotDone = false;

    for await (const chunk of provider.stream(testMessages)) {
      if (chunk.done) {
        gotDone = true;
      } else if (chunk.chunk) {
        chunks.push(chunk.chunk);
      }
    }

    expect(chunks).toEqual(['Hello', ' there']);
    expect(gotDone).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// OpenRouterProvider
// ---------------------------------------------------------------------------

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider({
      apiKey: 'or-test-key',
      defaultModel: 'openai/gpt-4o-mini',
      siteUrl: 'https://myapp.com',
      siteName: 'My App',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('openrouter');
  });

  it('chat() calls the OpenRouter API with correct headers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse({
        choices: [{ message: { content: 'From OpenRouter' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      }),
    );

    const result = await provider.chat(testMessages);

    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://openrouter.ai/api/v1/chat/completions',
    );

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer or-test-key');
    expect(headers['HTTP-Referer']).toBe('https://myapp.com');
    expect(headers['X-Title']).toBe('My App');

    expect(result.content).toBe('From OpenRouter');
  });

  it('embed() throws an error', async () => {
    await expect(provider.embed(['test'])).rejects.toThrow(
      'OpenRouter does not support embeddings',
    );
  });

  it('stream() yields chunks via SSE', async () => {
    const sseChunks = [
      JSON.stringify({ choices: [{ delta: { content: 'chunk1' } }] }),
      '[DONE]',
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createSSEResponse(sseChunks));

    const chunks: string[] = [];
    for await (const chunk of provider.stream(testMessages)) {
      if (!chunk.done && chunk.chunk) {
        chunks.push(chunk.chunk);
      }
    }

    expect(chunks).toEqual(['chunk1']);
  });
});

// ---------------------------------------------------------------------------
// AIProviderRegistry
// ---------------------------------------------------------------------------

describe('AIProviderRegistry', () => {
  let registry: AIProviderRegistry;

  beforeEach(() => {
    registry = new AIProviderRegistry();
  });

  it('registers and resolves a provider', () => {
    const mockProvider: IAIProvider = {
      name: 'test-provider',
      chat: vi.fn(),
      stream: vi.fn() as unknown as IAIProvider['stream'],
      embed: vi.fn(),
    };

    registry.register(mockProvider);
    const resolved = registry.resolve('test-provider');

    expect(resolved).toBe(mockProvider);
  });

  it('resolve() throws for unknown provider', () => {
    expect(() => registry.resolve('unknown')).toThrow(
      'AI provider "unknown" not registered',
    );
  });

  it('resolve() uses CRUZJS_AI_PROVIDER env var as default', () => {
    const originalEnv = process.env.CRUZJS_AI_PROVIDER;
    process.env.CRUZJS_AI_PROVIDER = 'my-default';

    const mockProvider: IAIProvider = {
      name: 'my-default',
      chat: vi.fn(),
      stream: vi.fn() as unknown as IAIProvider['stream'],
      embed: vi.fn(),
    };

    registry.register(mockProvider);
    const resolved = registry.resolve();

    expect(resolved).toBe(mockProvider);

    // Restore
    if (originalEnv === undefined) {
      delete process.env.CRUZJS_AI_PROVIDER;
    } else {
      process.env.CRUZJS_AI_PROVIDER = originalEnv;
    }
  });

  it('resolve() defaults to openai when no env var set', () => {
    const originalEnv = process.env.CRUZJS_AI_PROVIDER;
    delete process.env.CRUZJS_AI_PROVIDER;

    const mockProvider: IAIProvider = {
      name: 'openai',
      chat: vi.fn(),
      stream: vi.fn() as unknown as IAIProvider['stream'],
      embed: vi.fn(),
    };

    registry.register(mockProvider);
    const resolved = registry.resolve();

    expect(resolved).toBe(mockProvider);

    if (originalEnv !== undefined) {
      process.env.CRUZJS_AI_PROVIDER = originalEnv;
    }
  });

  it('list() returns all registered provider names', () => {
    const providers: IAIProvider[] = [
      { name: 'openai', chat: vi.fn(), stream: vi.fn() as unknown as IAIProvider['stream'], embed: vi.fn() },
      { name: 'anthropic', chat: vi.fn(), stream: vi.fn() as unknown as IAIProvider['stream'], embed: vi.fn() },
    ];

    providers.forEach((p) => registry.register(p));

    expect(registry.list()).toEqual(['openai', 'anthropic']);
  });

  it('list() returns empty array when no providers registered', () => {
    expect(registry.list()).toEqual([]);
  });
});
