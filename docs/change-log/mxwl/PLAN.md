# Plan: AIService Facade + Docs Cleanup

## Feature Overview

Two goals:

1. **AIService facade**: Expand the existing `AIService` (currently only `extractStructured`) into a clean facade covering text generation, embeddings, image description, and classification — mirroring how `StorageService` wraps R2 and `KVCacheService` wraps KV. Users should never touch `CloudflareContext.ai` or raw `fetch()` to AI Gateway directly.

2. **Docs cleanup**: Audit all docs pages and rewrite them to show **consumption patterns only** (inject service, call methods) instead of framework source code internals (class definitions, decorator details, container APIs).

## Task 1: AIService Facade

### Current State

- `AIService` exists at `packages/core/src/ai/ai.service.ts`
- Only has `extractStructured()` (AI Gateway via HTTP) and `isConfigured()`
- Text generation, embeddings, image analysis, sentiment — all shown in docs as raw `CloudflareContext.ai` usage
- Two duplicate docs pages: `advanced/ai.md` (Workers AI binding) and `cloudflare/ai.md` (AI Gateway)

### Target API

The AIService should be a clean facade with these methods:

```typescript
// What users see — the public API
class AIService {
  // Check availability
  isConfigured(): boolean

  // Text generation (chat completions)
  async chat(options: ChatOptions): Promise<string | null>

  // Structured data extraction (existing, unchanged)
  async extractStructured<T>(options: ExtractionOptions<T>): Promise<T | null>

  // Text embeddings
  async embed(texts: string[]): Promise<number[][] | null>

  // Image description
  async describeImage(image: ArrayBuffer, prompt?: string): Promise<string | null>

  // Sentiment analysis
  async analyzeSentiment(text: string): Promise<SentimentResult | null>
}
```

### Types to Add

```typescript
export type ChatOptions = {
  prompt: string;
  system?: string;
  size?: 'small' | 'medium' | 'large';
  temperature?: number;
  maxTokens?: number;
};

export type SentimentResult = {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
};

export type EmbeddingModel = 'small' | 'base' | 'large';
```

### Implementation Approach

- `chat()` and `extractStructured()` use AI Gateway (HTTP fetch) — works with external providers via CF AI Gateway
- `embed()`, `describeImage()`, `analyzeSentiment()` use `CloudflareContext.ai` (Workers AI binding) — runs on CF's network directly
- All methods return `null` on failure (never throw), matching existing pattern
- All methods log warnings when not configured
- Workers AI methods gracefully return `null` when binding unavailable (local dev)

### Implementation Tasks

- [ ] **1.1** Add new types (`ChatOptions`, `SentimentResult`, `EmbeddingModel`) to `packages/core/src/ai/ai.service.ts`
- [ ] **1.2** Add `chat()` method — extract the HTTP fetch logic from `extractStructured()` into a shared helper, reuse for chat (no JSON parsing/schema validation, just return text)
- [ ] **1.3** Add `embed()` method — use `CloudflareContext.ai` Workers AI binding with `@cf/baai/bge-base-en-v1.5` (configurable model)
- [ ] **1.4** Add `describeImage()` method — use Workers AI binding with `@cf/llava-hf/llava-1.5-7b-hf`
- [ ] **1.5** Add `analyzeSentiment()` method — use Workers AI binding with `@cf/huggingface/distilbert-sst-2-int8`
- [ ] **1.6** Export new types from `packages/core/src/ai/index.ts`
- [ ] **1.7** Merge the two AI docs pages into one unified page at `advanced/ai.md`, delete `cloudflare/ai.md`, update sidebar

## Task 2: Docs Cleanup

### Problem

Many docs pages show framework SOURCE CODE (class definitions with `@Injectable()`, internal constructor patterns, container internals) instead of CONSUMPTION patterns (inject service, call methods).

### Principle

Docs should show:
- ✅ How to inject a service: `@Inject(AIService) private ai: AIService`
- ✅ What methods are available and how to call them
- ✅ Usage in tRPC routers via `container.resolve()`
- ✅ Configuration (env vars, wrangler.toml)
- ❌ Internal class definitions with decorators
- ❌ How the framework implements things internally
- ❌ Full `CruzContainer` API surface
- ❌ Internal module/provider wiring

### Files to Fix

- [ ] **2.1** `advanced/ai.md` — Rewrite around AIService facade (task 1.7 above). Remove all raw `CloudflareContext.ai` usage, `@Injectable()` class definitions. Show only: inject AIService, call methods.
- [ ] **2.2** `advanced/caching.md` — Remove internal `KVCacheServiceFactory` construction details. Show: inject factory, create cache, call `get/set/delete`.
- [ ] **2.3** `advanced/jobs.md` — Remove full handler class definition internals. Show: implement interface, register in module, dispatch from service.
- [ ] **2.4** `advanced/email.md` — Remove internal `EmailModule` class/provider details. Show: inject EmailService, call `sendEmail()`.
- [ ] **2.5** `basics/services.md` — Focus on "here's how to create and use a service", not framework internals. Keep the pattern explanation but frame it as user code, not framework source.
- [ ] **2.6** `basics/trpc-routers.md` — Remove raw container type references. Show `container.resolve()` pattern only.
- [ ] **2.7** `basics/error-handling.md` — Remove internal error formatter implementation. Show how errors appear to users and how to customize.
- [ ] **2.8** `basics/logging.md` — Remove internal middleware processor class. Show: inject Logger, call methods.
- [ ] **2.9** `cloudflare/ai.md` — Delete (merged into advanced/ai.md in task 1.7)
- [ ] **2.10** `architecture/dependency-injection.md` — Keep as architecture deep-dive but trim `CruzContainer` internals. Users use `getAppContainer()` and `container.resolve()`, not the full API.
- [ ] **2.11** `architecture/service-providers.md` — Lead with `@Module()` pattern (preferred), demote legacy `ServiceProvider` interface.
- [ ] **2.12** `pro/permissions.md` — Remove internal `PermissionService` method signatures. Show: use `requirePermission()` middleware, check roles in UI.
- [ ] **2.13** Update sidebar in `astro.config.mjs` — Remove `cloudflare/ai` entry (merged into `advanced/ai`).

### Docs Cleanup Guidelines

When rewriting, follow this template for service docs:

```markdown
## Configuration
[env vars, wrangler.toml settings]

## Quick Start
[inject service, one simple example]

## API Reference
### method(args): ReturnType
[description, example]

## Usage in Routers
[tRPC example with container.resolve()]

## Best Practices
[short list]
```

## Execution Order

1. **Phase 1**: AIService facade (tasks 1.1-1.6) — code changes
2. **Phase 2**: Merge AI docs (task 1.7) — combine two pages
3. **Phase 3**: Docs cleanup (tasks 2.1-2.13) — rewrite all affected pages
4. **Phase 4**: Build docs, deploy
