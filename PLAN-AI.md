# PLAN: `@cruzjs/ai` — Unified AI + MCP Package

## Goal

One package for all AI concerns. World-class streaming, provider-agnostic adapter pattern, MCP server, React hooks. Developer writes AI features without thinking about which provider or hosting platform.

## Current State

| Piece | Location | Problem |
|-------|----------|---------|
| `AIService` | `packages/core/src/ai/` | Hardcoded to CF AI Gateway. No streaming. No conversation. No tool use. |
| `AIBinding` interface | `packages/core/src/runtime/types.ts` | Too simple — `chat()` returns `string`. No streaming. |
| `AiConnectionsService` | `packages/start/src/ai-connections/` | Good — org-level multi-provider key management. Keep. |
| `OpenAICompatibleAIBinding` | Each adapter's `bindings/` | Same code duplicated across AWS/GCP/Azure/DO adapters. |
| MCP package | `packages/mcp/` | Solid. Decorators, registry, SSE/HTTP transport. Keep structure. |

## Package Structure

```
packages/ai/
├── package.json                      # @cruzjs/ai
├── tsconfig.json
├── src/
│   ├── index.ts                      # Public API
│   │
│   ├── providers/                    # LLM provider adapters
│   │   ├── types.ts                  # AIProvider interface (the core contract)
│   │   ├── anthropic.ts              # Direct Anthropic API
│   │   ├── openai.ts                 # Direct OpenAI API
│   │   ├── google.ts                 # Direct Google Gemini API
│   │   ├── openrouter.ts            # OpenRouter (all models, one key)
│   │   ├── cloudflare-gateway.ts     # CF AI Gateway (caching, logging, rate limits)
│   │   ├── fireworks.ts              # Fireworks AI
│   │   ├── bedrock.ts                # AWS Bedrock (SigV4 auth)
│   │   ├── vertex.ts                 # Google Vertex AI
│   │   └── openai-compatible.ts      # Base class for any OpenAI-compat endpoint
│   │
│   ├── core/                         # Core AI service
│   │   ├── ai.service.ts             # Main injectable service
│   │   ├── ai.module.ts              # DI module registration
│   │   ├── conversation.ts           # Multi-turn conversation with history
│   │   ├── tool-use.ts               # Tool calling: define, execute, loop
│   │   ├── middleware.ts             # Request/response middleware chain
│   │   └── types.ts                  # AIMessage, StreamChunk, ChatOptions, etc.
│   │
│   ├── streaming/                    # Streaming infrastructure
│   │   ├── stream.ts                 # Core AsyncIterable<StreamChunk> + helpers
│   │   ├── sse-response.ts           # Stream → SSE Response for raw endpoints
│   │   ├── trpc-stream.ts            # tRPC subscription/streaming helpers
│   │   └── parsers/                  # Per-provider SSE parsers
│   │       ├── anthropic-parser.ts   # Anthropic event stream format
│   │       ├── openai-parser.ts      # OpenAI SSE format (also OpenRouter, Fireworks)
│   │       └── google-parser.ts      # Google streaming format
│   │
│   ├── structured/                   # Structured output extraction
│   │   ├── structured.ts             # Zod schema → validated typed response
│   │   └── retry.ts                  # Retry logic with validation feedback
│   │
│   ├── embeddings/                   # Vector embeddings
│   │   ├── embeddings.service.ts     # Embed service (provider-agnostic)
│   │   └── types.ts                  # EmbeddingOptions, EmbeddingResult
│   │
│   ├── mcp/                          # MCP server (absorbed from packages/mcp/)
│   │   ├── core/                     # registry, executor, session, types
│   │   │   ├── types.ts
│   │   │   ├── registry.ts
│   │   │   ├── executor.ts
│   │   │   └── session.ts
│   │   ├── decorators/               # @McpTool, @McpResource, @McpPrompt
│   │   │   └── index.ts
│   │   ├── transport/                # SSE, streamable-http, encoder
│   │   │   ├── sse.ts
│   │   │   ├── streamable-http.ts
│   │   │   └── encoder.ts
│   │   ├── auth/                     # McpSessionAuth, McpNoAuth
│   │   │   └── mcp-auth.ts
│   │   ├── di/                       # createMcpServer, registerMcpProviders
│   │   │   └── module.ts
│   │   ├── route-handler.ts
│   │   └── bridge.ts                 # NEW: MCP tools ↔ AI tool calling bridge
│   │
│   └── react/                        # Client-side hooks (shipped as subpath export)
│       ├── index.ts
│       ├── use-chat.ts               # Streaming chat hook
│       ├── use-completion.ts         # Single completion hook
│       ├── use-structured.ts         # Structured output hook with Zod
│       └── chat-context.tsx          # React context provider for chat state
```

## Core Interfaces

### AIProvider — The Adapter Contract

Every provider implements this. Runtime adapters resolve which one to use.

```typescript
interface AIProvider {
  readonly name: string;

  /** Non-streaming chat completion */
  chat(options: ChatOptions): Promise<ChatResponse>;

  /** Streaming chat completion */
  stream(options: ChatOptions): AsyncIterable<StreamChunk>;

  /** Optional: embeddings (not all providers support) */
  embed?(texts: string[], model?: string): Promise<number[][]>;

  /** Optional: image description / vision */
  vision?(options: VisionOptions): Promise<string>;

  /** Optional: provider-specific capabilities */
  capabilities(): ProviderCapabilities;
}

interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  embeddings: boolean;
  structuredOutput: boolean;   // native JSON mode
  maxContextTokens?: number;
}
```

### ChatOptions — Input

```typescript
interface ChatOptions {
  messages: AIMessage[];
  model?: string;                // override provider default
  temperature?: number;          // 0-2
  maxTokens?: number;
  tools?: AIToolDef[];           // for tool calling
  responseFormat?: 'text' | 'json';
  signal?: AbortSignal;          // cancellation support
  metadata?: Record<string, string>;  // for logging/tracing
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  name?: string;                 // tool name (when role === 'tool')
  toolCalls?: ToolCall[];        // assistant tool calls
  toolCallId?: string;           // tool result reference
}

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  image?: { url: string } | { base64: string; mediaType: string };
}
```

### StreamChunk — Output

```typescript
interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'usage' | 'done' | 'error';

  // Text streaming
  text?: string;

  // Tool calling
  toolCall?: {
    id: string;
    name: string;
    args: string;           // accumulated JSON string
  };

  // Usage (on 'done')
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  // Error
  error?: string;
}
```

### AIToolDef — Tool Calling

```typescript
interface AIToolDef {
  name: string;
  description: string;
  parameters: z.ZodType<unknown>;   // Zod schema, auto-converted to JSON Schema
  handler: (args: unknown) => Promise<unknown>;
}
```

## Developer-Facing API (AIService)

What app developers inject and use. No provider details leak through.

```typescript
@injectable()
class AIService {
  // ─── Simple ──────────────────────────────────────────────
  /** One-shot chat. Returns string. */
  async chat(prompt: string, options?: SimpleChatOptions): Promise<string>

  /** One-shot chat with system prompt. */
  async chat(options: { prompt: string; system: string; ... }): Promise<string>

  // ─── Streaming ───────────────────────────────────────────
  /** Stream text chunks. Use with for-await. */
  stream(prompt: string, options?: SimpleChatOptions): AsyncIterable<StreamChunk>

  /** Stream to SSE Response (for raw Cloudflare Workers routes). */
  streamToResponse(prompt: string, options?: SimpleChatOptions): Response

  // ─── Structured ──────────────────────────────────────────
  /** Extract typed data validated against Zod schema. Auto-retries. */
  async extract<T>(options: {
    prompt: string;
    schema: z.ZodType<T>;
    system?: string;
    maxRetries?: number;
  }): Promise<T>

  // ─── Conversation ────────────────────────────────────────
  /** Create multi-turn conversation with history management. */
  conversation(systemPrompt?: string): Conversation

  // ─── Tool Use ────────────────────────────────────────────
  /** Run prompt with tools. Agent loop: call tools until done or maxIterations. */
  async runWithTools(options: {
    prompt: string;
    tools: AIToolDef[];
    system?: string;
    maxIterations?: number;
  }): Promise<ToolRunResult>

  /** Run prompt with tools, streaming each step. */
  streamWithTools(options: {
    prompt: string;
    tools: AIToolDef[];
    system?: string;
    maxIterations?: number;
  }): AsyncIterable<ToolStreamEvent>

  // ─── Embeddings ──────────────────────────────────────────
  async embed(texts: string[], model?: string): Promise<number[][]>

  // ─── Org-Scoped ──────────────────────────────────────────
  /** Get AIService using org's configured provider + API key. */
  forOrg(orgId: string): Promise<AIService>

  // ─── Provider Access ─────────────────────────────────────
  /** Get raw provider for advanced use cases. */
  get provider(): AIProvider
}
```

### Conversation API

```typescript
interface Conversation {
  /** Send message, get response. */
  send(content: string): Promise<string>;

  /** Send message, stream response. */
  stream(content: string): AsyncIterable<StreamChunk>;

  /** Send with tools available. */
  sendWithTools(content: string, tools: AIToolDef[]): Promise<ToolRunResult>;

  /** Full message history. */
  readonly history: AIMessage[];

  /** Fork conversation (branch from current point). */
  fork(): Conversation;

  /** Reset to system prompt only. */
  reset(): void;

  /** Trim history to last N messages (keep system). */
  trim(keepLast: number): void;
}
```

## Streaming Through tRPC to React (End-to-End)

This is the killer feature. Type-safe streaming from provider → server → client.

### Server: tRPC Router

```typescript
// app/server/routers/chat.ts
import { orgProcedure } from '@cruzjs/core';
import { AIService } from '@cruzjs/ai';
import { z } from 'zod';

export const chatRouter = router({
  /** Streaming chat response */
  stream: orgProcedure
    .input(z.object({ message: z.string(), conversationId: z.string().optional() }))
    .subscription(async function* ({ input, ctx }) {
      const ai = await ctx.container.get(AIService).forOrg(ctx.orgId);
      const conversation = ai.conversation('You are a helpful assistant.');

      for await (const chunk of conversation.stream(input.message)) {
        yield chunk;
      }
    }),

  /** Structured extraction */
  extractInvoice: orgProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ai = await ctx.container.get(AIService).forOrg(ctx.orgId);
      return ai.extract({
        prompt: `Extract invoice data from: ${input.text}`,
        schema: InvoiceSchema,
      });
    }),

  /** Tool-augmented chat */
  agent: orgProcedure
    .input(z.object({ message: z.string() }))
    .subscription(async function* ({ input, ctx }) {
      const ai = await ctx.container.get(AIService).forOrg(ctx.orgId);

      for await (const event of ai.streamWithTools({
        prompt: input.message,
        tools: [searchTool, createTaskTool, sendEmailTool],
        maxIterations: 5,
      })) {
        yield event;
      }
    }),
});
```

### Client: React Hooks

```typescript
// In a React component
import { useChat, useStructured } from '@cruzjs/ai/react';

function ChatInterface() {
  const {
    messages,        // AIMessage[]
    send,            // (text: string) => void
    isStreaming,     // boolean
    stop,            // () => void — abort current stream
    error,           // Error | null
  } = useChat({
    // Connects to tRPC subscription automatically
    procedure: trpc.chat.stream,
    systemPrompt: 'You are a helpful assistant.',
  });

  return (
    <div>
      {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
      {isStreaming && <StreamingIndicator />}
      <ChatInput onSend={send} disabled={isStreaming} />
    </div>
  );
}

function InvoiceExtractor() {
  const { extract, data, loading, error } = useStructured({
    procedure: trpc.chat.extractInvoice,
    schema: InvoiceSchema,  // type-safe: data is Invoice | null
  });

  return (
    <div>
      <Button onClick={() => extract({ text: ocrText })}>Extract</Button>
      {data && <InvoiceDisplay invoice={data} />}
    </div>
  );
}
```

## MCP ↔ AI Tool Bridge

Key integration: MCP tools registered with `@McpTool` can also be used as AI tools.

```typescript
// bridge.ts — converts MCP tool registry → AIToolDef[]

import { McpRegistry } from './core/registry';

/** Get all registered MCP tools as AI-callable tools. */
function mcpToolsAsAITools(
  registry: McpRegistry,
  options?: { filter?: string[]; serverId?: string }
): AIToolDef[]

// Usage: let AI call your MCP tools
const tools = mcpToolsAsAITools(registry);
const result = await ai.runWithTools({
  prompt: 'Find all overdue invoices and send reminders',
  tools,
});
```

## Provider Adapter Details

### How Providers Map to Runtime Adapters

| Runtime Adapter | Default AIProvider | Why |
|----------------|-------------------|-----|
| `adapter-cloudflare` | `CloudflareGatewayProvider` | Uses CF AI Gateway for caching, logging, rate limits |
| `adapter-aws` | `BedrockProvider` or `OpenAICompatibleProvider` | Bedrock for AWS-native, OpenAI-compat for flexibility |
| `adapter-gcp` | `VertexProvider` or `OpenAICompatibleProvider` | Vertex for GCP-native |
| `adapter-azure` | `OpenAICompatibleProvider` | Azure OpenAI endpoint |
| `adapter-docker` | `OpenAICompatibleProvider` | User provides any endpoint |

Developers can always override via config:

```typescript
// cruz.config.ts
export default defineConfig({
  ai: {
    provider: 'openrouter',       // or 'anthropic', 'openai', etc.
    model: 'anthropic/claude-sonnet-4',
    apiKey: env.OPENROUTER_API_KEY,
  },
});
```

### OpenRouter as the Universal Backend

OpenRouter deserves special treatment — single API key, access to every model:

```typescript
// providers/openrouter.ts
class OpenRouterProvider extends OpenAICompatibleProvider {
  readonly name = 'openrouter';
  readonly baseUrl = 'https://openrouter.ai/api/v1';

  // OpenRouter extras:
  // - Model fallback chains
  // - Cost tracking per request
  // - Provider routing preferences
  override chat(options: ChatOptions): Promise<ChatResponse> {
    return super.chat({
      ...options,
      headers: {
        'HTTP-Referer': this.config.siteUrl,
        'X-Title': this.config.appName,
      },
    });
  }
}
```

## Middleware Chain

Composable middleware for cross-cutting concerns:

```typescript
interface AIMiddleware {
  (options: ChatOptions, next: () => Promise<ChatResponse>): Promise<ChatResponse>;
}

// Built-in middleware:
const loggingMiddleware: AIMiddleware       // log all requests/responses
const costTrackingMiddleware: AIMiddleware  // track token usage per org
const rateLimitMiddleware: AIMiddleware     // per-org rate limiting
const cachingMiddleware: AIMiddleware       // cache identical prompts (KV-backed)
const retryMiddleware: AIMiddleware         // retry on 429/5xx with backoff
const contentFilterMiddleware: AIMiddleware // filter unsafe content

// User-defined:
ai.use(async (options, next) => {
  console.log('Prompt:', options.messages);
  const response = await next();
  console.log('Tokens:', response.usage);
  return response;
});
```

## React Hooks API (`@cruzjs/ai/react`)

### `useChat`

Full streaming chat with message history management.

```typescript
function useChat(options: {
  procedure: TRPCProcedure;       // type-safe tRPC subscription
  systemPrompt?: string;
  initialMessages?: AIMessage[];
  onError?: (error: Error) => void;
  onFinish?: (message: AIMessage) => void;
}): {
  messages: AIMessage[];
  send: (content: string) => void;
  isStreaming: boolean;
  stop: () => void;
  error: Error | null;
  reload: () => void;            // retry last message
  setMessages: (msgs: AIMessage[]) => void;
}
```

### `useCompletion`

Single-shot text generation (not chat).

```typescript
function useCompletion(options: {
  procedure: TRPCProcedure;
}): {
  completion: string;
  complete: (prompt: string) => void;
  isLoading: boolean;
  error: Error | null;
  stop: () => void;
}
```

### `useStructured<T>`

Type-safe structured extraction.

```typescript
function useStructured<T>(options: {
  procedure: TRPCProcedure;
  schema: z.ZodType<T>;
}): {
  data: T | null;
  extract: (input: unknown) => void;
  isLoading: boolean;
  error: Error | null;
}
```

## Migration Path

### Phase 1: Create Package, Move MCP

1. Create `packages/ai/` with package.json, tsconfig
2. Move `packages/mcp/src/*` → `packages/ai/src/mcp/`
3. Re-export everything from `@cruzjs/ai/mcp` subpath
4. Deprecate `@cruzjs/mcp` (re-export from `@cruzjs/ai/mcp` for backwards compat)
5. Delete `packages/core/src/ai/` (absorbed into new package)

### Phase 2: Provider Adapters

1. Define `AIProvider` interface in `providers/types.ts`
2. Implement `OpenAICompatibleProvider` base class (covers OpenAI, Fireworks, OpenRouter, Azure)
3. Implement `AnthropicProvider` (native API, not OpenAI-compat — needed for prompt caching, extended thinking)
4. Implement `GoogleProvider` (native Gemini API)
5. Implement `CloudflareGatewayProvider` (wraps CF AI Gateway)
6. Remove duplicated `OpenAICompatibleAIBinding` from all runtime adapters
7. Update `RuntimeAdapter.getAI()` to return `AIProvider` instead of `AIBinding`

### Phase 3: Streaming

1. Build core `AsyncIterable<StreamChunk>` abstraction
2. Implement per-provider SSE parsers (Anthropic, OpenAI, Google each have different formats)
3. Add `stream()` method to `AIService`
4. Build `streamToResponse()` for raw SSE endpoints
5. Build tRPC streaming subscription helpers
6. Build SSE → client parser for React hooks

### Phase 4: Tool Use + Conversations

1. `AIToolDef` with Zod → JSON Schema conversion
2. Tool execution loop (send → get tool calls → execute → send results → repeat)
3. `Conversation` class with history, fork, trim
4. MCP bridge: `mcpToolsAsAITools()` adapter
5. `streamWithTools()` — streaming agent loop

### Phase 5: React Hooks

1. `useChat` — streaming chat with message management
2. `useCompletion` — single generation
3. `useStructured` — typed extraction
4. Ship as `@cruzjs/ai/react` subpath export

### Phase 6: Middleware + Polish

1. Middleware chain architecture
2. Built-in middleware: logging, cost tracking, retry, caching
3. `forOrg()` integration with `AiConnectionsService`
4. Update all runtime adapters to use new provider system
5. Documentation + examples

## What This Enables

### For SaaS Builders (CruzJS users)

```typescript
// 10 lines to add AI chat to any SaaS feature
const ai = await ctx.container.get(AIService).forOrg(ctx.orgId);
for await (const chunk of ai.stream('Summarize this document')) {
  yield chunk;
}
```

### For AI-First Apps

```typescript
// Define tools, let AI use them
await ai.runWithTools({
  prompt: 'Find overdue invoices and draft reminder emails',
  tools: [queryInvoicesTool, draftEmailTool, sendEmailTool],
  maxIterations: 10,
});
```

### For MCP Server Builders

```typescript
// Same decorators, now with AI tool bridge
@McpTool({ name: 'search', description: 'Search the knowledge base' })
async search(@McpParam() query: string) { ... }

// These tools are automatically available to AI:
const tools = mcpToolsAsAITools(registry);
```

## Competitive Position

| Feature | Vercel AI SDK | LangChain | CruzJS AI |
|---------|--------------|-----------|-----------|
| Streaming | Yes | Yes | Yes |
| Type-safe end-to-end | Partial (no tRPC) | No | Yes (tRPC + Zod) |
| Multi-provider | Yes | Yes | Yes |
| Tool calling | Yes | Yes | Yes + MCP bridge |
| MCP server | No | No | Built-in |
| DI integration | No | No | Yes (Inversify) |
| Org-scoped keys | No | No | Yes (AiConnectionsService) |
| Runtime adapter aware | No | No | Yes (CF/AWS/GCP/Azure/Docker) |
| React hooks | Yes | No | Yes |
| Middleware chain | No | Yes (verbose) | Yes (simple) |

**Key differentiator**: No other framework gives you org-scoped AI with encrypted key management, runtime-adapter-aware provider selection, MCP server, AND streaming React hooks in one package. Vercel AI SDK is closest but has no DI, no MCP, no multi-tenant key management.
