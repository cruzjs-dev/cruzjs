---
title: AI Integration
description: Provider-agnostic AI with streaming tRPC, MCP tool-calling, org-scoped keys, and React hooks — all through @cruzjs/ai.
---

CruzJS ships two AI layers:

- **`@cruzjs/core` AIService** — adapter-native AI (Workers AI on Cloudflare, Bedrock on AWS, etc.) injected automatically based on deployment target.
- **`@cruzjs/ai`** — provider-agnostic AI with explicit providers (OpenAI, Anthropic, Cloudflare Gateway, OpenRouter), streaming, MCP tool-calling, org-scoped keys, and React hooks.

Most apps want `@cruzjs/ai`. It doesn't assume a deployment target.

## Setup

Install the package (already in the monorepo):

```bash
# @cruzjs/ai is in packages/ai — no npm install needed in the monorepo
```

Register the `AIContainerModule` in your app:

```typescript
// apps/web/src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { getAppContainer } from '@cruzjs/core';
import { StartModule } from '@cruzjs/start/start.module';
import { AIContainerModule } from '@cruzjs/ai';

registerModules([StartModule /* , your feature modules */]);

// Load @cruzjs/ai provider services into the app container
const container = await getAppContainer();
container.load(AIContainerModule);
```

Register your chosen provider:

```typescript
// In app.server.ts, after registerModules(...)
import { getAppContainer } from '@cruzjs/core';
import { OpenAIProvider, AnthropicProvider, AI_PROVIDER_REGISTRY } from '@cruzjs/ai';

const container = await getAppContainer();
const registry = container.get(AI_PROVIDER_REGISTRY);
registry.register(new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! }));
registry.register(new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! }));
```

Set the default provider via env var:

```env
CRUZJS_AI_PROVIDER=openai
```

## Providers

All providers implement `IAIProvider` and use raw `fetch()` — no external SDKs required.

| Provider | Class | API |
|---|---|---|
| OpenAI | `OpenAIProvider` | `api.openai.com` |
| Anthropic | `AnthropicProvider` | `api.anthropic.com` |
| Cloudflare AI Gateway | `CloudflareGatewayProvider` | Your CF Gateway URL |
| OpenRouter | `OpenRouterProvider` | `openrouter.ai` |

```typescript
import { OpenAIProvider, AnthropicProvider, CloudflareGatewayProvider, OpenRouterProvider } from '@cruzjs/ai';

// OpenAI
new OpenAIProvider({ apiKey: 'sk-...', defaultModel: 'gpt-4o' })

// Anthropic
new AnthropicProvider({ apiKey: 'sk-ant-...', defaultModel: 'claude-sonnet-4-6' })

// Cloudflare AI Gateway (OpenAI-compatible)
new CloudflareGatewayProvider({
  accountId: 'abc123',
  gatewayId: 'my-gateway',
  apiKey: 'cf-...',
  defaultModel: '@cf/meta/llama-3.1-8b-instruct',
})

// OpenRouter (any model via one key)
new OpenRouterProvider({
  apiKey: 'sk-or-...',
  defaultModel: 'anthropic/claude-sonnet-4-6',
  siteUrl: 'https://myapp.com',
  siteName: 'My App',
})
```

## Chat

```typescript
import { AIProviderRegistry, AI_PROVIDER_REGISTRY } from '@cruzjs/ai';

@injectable()
export class PostsService {
  constructor(
    @inject(AI_PROVIDER_REGISTRY) private aiRegistry: AIProviderRegistry,
  ) {}

  async summarize(text: string): Promise<string> {
    const ai = this.aiRegistry.resolve(); // uses CRUZJS_AI_PROVIDER
    const response = await ai.chat([
      { role: 'system', content: 'Summarize the following text concisely.' },
      { role: 'user', content: text },
    ]);
    return response.content;
  }
}
```

## Streaming

Stream tokens as they arrive using `stream()`, which returns `AsyncIterable<StreamChunk>`:

```typescript
const ai = this.aiRegistry.resolve();

for await (const chunk of ai.stream([
  { role: 'user', content: 'Write a haiku about Cloudflare Workers.' },
])) {
  if (!chunk.done) {
    process.stdout.write(chunk.chunk);
  }
}
```

## React Hooks

### `useStream`

Accumulates streaming chunks into a single text string:

```tsx
import { useStream } from '@cruzjs/ai/hooks';

function StreamingResponse() {
  const { text, isStreaming, error, stream, reset } = useStream();

  const handleClick = () => {
    const ai = /* get provider somehow */;
    stream(ai, [{ role: 'user', content: 'Tell me a joke.' }]);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={isStreaming}>
        {isStreaming ? 'Streaming...' : 'Generate'}
      </button>
      {error && <p className="text-red-600">{error.message}</p>}
      <p>{text}</p>
    </div>
  );
}
```

### `useChat`

Multi-turn conversation with message history:

```tsx
import { useChat } from '@cruzjs/ai/hooks';

function ChatInterface() {
  const { messages, send, isStreaming, reset } = useChat({ provider: myProvider });

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
          {m.content}
        </div>
      ))}
      <button onClick={() => send('What is CruzJS?')} disabled={isStreaming}>
        Ask
      </button>
    </div>
  );
}
```

## Tool Calling (MCP Bridge)

`McpBridge.runWithTools()` runs the agentic tool-call loop: provider returns a tool call → your executor is called → result is appended → provider continues. Repeats up to `maxRounds` (default: 5).

```typescript
import { McpBridge } from '@cruzjs/ai';

const result = await McpBridge.runWithTools(provider, [
  { role: 'user', content: 'Search for posts about CruzJS and summarize them.' },
], {
  tools: [
    { name: 'search_posts', description: 'Search blog posts', parameters: { query: { type: 'string' } } },
  ],
  executor: async (toolCall) => {
    if (toolCall.name === 'search_posts') {
      const posts = await searchPosts(toolCall.arguments.query as string);
      return JSON.stringify(posts);
    }
    return 'Tool not found';
  },
  maxRounds: 3,
});

console.log(result.content); // Final answer after tool use
console.log(result.rounds);  // How many tool-call rounds happened
```

## Org-Scoped Keys

Let each org configure their own AI provider and API key:

```typescript
import { OrgAIConfigService } from '@cruzjs/ai';

// Configure in admin settings
const orgAIService = container.get(OrgAIConfigService);
orgAIService.setOrgConfig('org_abc', {
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  defaultModel: 'claude-haiku-4-5-20251001',
  enabled: true,
});

// Resolve org's provider in a tRPC procedure
const orgProvider = orgAIService.forOrg('org_abc', registry);
if (!orgProvider) throw new TRPCError({ code: 'FORBIDDEN', message: 'AI not configured for this org' });

const response = await orgProvider.chat([{ role: 'user', content: input.prompt }]);
```

## Usage Tracking

Track token consumption across all AI calls:

```typescript
import { AIUsageTracker, AI_USAGE_TRACKER } from '@cruzjs/ai';

// After an AI call:
const tracker = container.get(AI_USAGE_TRACKER);
tracker.record({
  orgId: ctx.org.orgId,
  provider: 'openai',
  model: 'gpt-4o',
  inputTokens: response.inputTokens ?? 0,
  outputTokens: response.outputTokens ?? 0,
  durationMs: Date.now() - startTime,
  timestamp: new Date(),
});

// Query usage:
const summary = tracker.getSummary('org_abc');
// { totalInputTokens: 15000, totalOutputTokens: 3200, totalRequests: 42 }
```

## tRPC Integration

Wire the AI tRPC router into your app:

```typescript
// apps/web/src/app.server.ts — expose the AI router via a module
import { Module } from '@cruzjs/core/di';
import { AITrpc } from '@cruzjs/ai';

@Module({
  trpcRouters: {
    ai: AITrpc,
  },
})
class AIFeatureModule {}

// Add AIFeatureModule to your registerModules([...]) call
registerModules([StartModule, AIFeatureModule]);
```

Available procedures:
- `ai.chat` — mutation, takes `{ messages, options? }`, returns `AIResponse`
- `ai.embed` — mutation, takes `{ texts }`, returns `{ embeddings: number[][] }`
- `ai.providers` — query, returns list of registered provider names

## Embeddings

```typescript
const ai = this.aiRegistry.resolve();
const embeddings = await ai.embed(['first document', 'second document']);
// embeddings: number[][] — one vector per text
```

Use embeddings for semantic search, similarity scoring, or RAG pipelines.

## Local Development

All providers use `fetch()` and work locally as long as you have API keys:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
CRUZJS_AI_PROVIDER=openai
```

No Wrangler or cloud-specific bindings needed for `@cruzjs/ai`.
