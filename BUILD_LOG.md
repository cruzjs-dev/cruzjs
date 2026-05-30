# Build Log — CruzJS Demo App

A running log of how we build features on the CruzJS demo app (`apps/demo`), deployed to Cloudflare Pages via the target-agnostic infra abstraction.

---

## Feature: PDF Upload + AI Analysis + Chat Preview

**Goal:** Users upload a PDF → it's stored in object storage (R2) → AI extracts the text and produces an analysis → a chat panel lets the user ask questions about the document.

**Date:** 2026-05-29

### Why these pieces

| Need | Logical binding | Cloudflare native | Notes |
|------|-----------------|-------------------|-------|
| Store the PDF bytes | `blob` | R2 (`r2_buckets`) | bound as `STORAGE` so `CloudflareContext.r2` resolves it |
| Extract text from PDF | `llm` (AI binding) | Workers AI `AI.toMarkdown()` | converts PDF → markdown, no extra parser dep |
| Analyze + chat | `llm` (AI binding) | Workers AI `AI.run('@cf/meta/llama-3.1-8b-instruct')` | raw binding, avoids AI-Gateway token dependency |
| Persist metadata/analysis | `sql` | D1 | `Pdf` table |

The infra abstraction (`packages/cli/src/infra`) already maps `blob → r2` in the Cloudflare adapter (`genBlob` → `r2_buckets`). So "make the infra support this" = declare a `storage` blob binding in the ship config and provision the bucket; no adapter changes needed.

### Architecture decisions (and why)

1. **Server-only `PdfService`, resolved by Symbol token in the tRPC router.**
   The tRPC routers are bundled into the *client* graph (router.ts imports each router value for the `AppRouter` type). So a router file must never statically import server-only modules (drizzle local-db, R2/local storage drivers, `CloudflareContext`). The existing `chatbots.trpc.ts` dodges this by resolving the DB via `Symbol.for('DrizzleDatabase')`. We extend that: all heavy PDF logic lives in `apps/demo/src/server/pdf.service.ts` (server-only, imports anything it wants), bound in `app.server.ts`, and the router resolves it via `ctx.container.get(Symbol.for('PdfService'))`.
   - `createToken(name)` === `Symbol.for(name)`, and the module loader binds bare classes under `Symbol.for(ClassName)` — so `Symbol.for('PdfService')` is the resolution key.

2. **Raw `CloudflareContext.ai` instead of `AIService.chat()`.**
   `AIService.chat()` routes through Cloudflare AI Gateway and needs `CF_AIG_TOKEN` + account id secrets. The raw `AI` binding only needs the `[ai]` wrangler binding (already present), so it's more robust for a self-contained demo. `PdfService` calls `ai.toMarkdown(...)` and `ai.run('@cf/meta/llama-3.1-8b-instruct', { messages })` directly.

3. **Upload via tRPC base64, not presigned URL.**
   The R2 storage driver doesn't implement presigned upload URLs (it throws). For demo-sized PDFs, the client base64-encodes the file and sends it through a tRPC mutation; the server decodes to a Buffer and `StorageService.disk().put(...)`. Capped at 10 MB.

### Runtime access map (verified by reading core)

- DB: `ctx.container.get(Symbol.for('DrizzleDatabase'))`
- R2: `CloudflareContext.r2` (binding `UPLOADS_BUCKET` || `STORAGE`) via `StorageService.disk()` → `.put/.get/.delete`
- AI: `CloudflareContext.ai` → `.toMarkdown([{name, blob}])`, `.run(model, {messages})`
- `SharedModule` (StorageService) + `AIModule` (AIService) are loaded by default in `application.server.ts`.

### Implementation steps

1. **DB** — `apps/demo/src/database/pdfs.schema.ts` (`Pdf` table: id, ownerId, name, r2Key, sizeBytes, status, extractedText, analysis, error, createdAt). Re-exported from `schema.ts`. Hand-written migration `0004_add_pdfs.sql` (drizzle-kit generate is TTY-blocked in this env).
2. **Server logic** — `apps/demo/src/server/pdf.service.ts` (`@Injectable`, injects DB via `DRIZZLE`). `upload()`: R2 `put` → `ai.toMarkdown` → `ai.run` analysis → insert. `chat()`: loads extracted text as system context, `ai.run`. `remove()`: R2 delete + row delete.
3. **Router** — `apps/demo/src/trpc/pdfs.trpc.ts` (thin; type-only import of PdfService; resolves it via `Symbol.for('PdfService')`). Upload takes base64, decodes to `Uint8Array`.
4. **Wiring** — `app.server.ts`: added `PdfService` to providers + `pdfs: pdfsTrpc` to trpcRouters. `router.ts`: `pdfs: pdfsTrpc` for the client type. `client.ts`: registered `{ label: 'PDFs', to: '/pdfs' }` nav.
5. **Frontend** — `apps/demo/src/routes/pdfs.tsx` (upload via FileReader→base64, list, analysis view, chat panel). Route registered in `routes.ts`.
6. **Infra** — `scripts/ship-infra.ts`: added `storage: { type: 'blob' }` to the config + seeded state with R2 bucket `cruzjs-production-docs`. The abstraction resolved `storage blob → native:r2` and emitted the `r2_buckets` block with binding `STORAGE`. No adapter changes needed.
7. **Deploy** — build from `apps/demo`, `wrangler r2 bucket create cruzjs-production-docs`, `wrangler d1 migrations apply --remote` (0004), `wrangler pages deploy dist/client --branch main`.

### Gotcha that cost a deploy cycle (worth remembering)

First deploy: `pdfs.list` returned 500 — `No bindings found for Symbol(PdfService)`. Root cause: the production SSR bundle **minifies class names**, and `@Injectable()` derives its DI token from `class.name` (`Symbol.for(class.name)`). So `PdfService` was bound under `Symbol.for('<minified>')`, but the tRPC router resolved the *literal* `Symbol.for('PdfService')` → mismatch. Core services don't hit this because both the binding and `@inject(ClassName)` use the same (minified) class reference, so they agree. A hardcoded string token does not.

**Fix:** pin the token — `@Injectable({ name: 'PdfService' })`. Any service resolved by a hardcoded `Symbol.for('Name')` from a *separate* (client-bundled) module MUST use an explicit `@Injectable({ name })`, never the class-name default.

Diagnosis tool: `wrangler pages deployment tail <deployment-id> --project-name cruzjs --format pretty` streamed the live tRPC error.

### Follow-up: route ALL AI through the Cruz AIService (no raw env.AI)

Per project rule — feature code must never touch the raw `env.AI` / `CloudflareContext.ai` binding; always use the Cruz **AIService**. Refactored:

- **AIService** (`packages/core/src/ai/ai.service.ts`) gained two methods so it owns the raw binding:
  - `toMarkdown(files)` — wraps `env.AI.toMarkdown` for PDF→text.
  - `chatMessages(messages, opts?)` — multi-turn chat; uses the **AI Gateway when configured**, else falls back to the Workers AI binding (Llama). This means AIService works with or without gateway secrets.
- **PdfService** now injects `AIService` and calls `ai.toMarkdown(...)` / `ai.chatMessages(...)`. No `env.AI` in app code.

**AI Gateway status:** not currently configured in prod (`wrangler pages secret list` shows no `CF_AIG_TOKEN`; account id / gateway id aren't set either). So `chatMessages` currently runs the Workers-AI fallback. To switch to gateway later: create an AI Gateway, set `CLOUDFLARE_ACCOUNT_ID` + `CF_AI_GATEWAY_ID` vars and the `CF_AIG_TOKEN` secret — then AIService routes through it automatically (caching/observability/better models).

**Storage caveat:** tried routing storage through Cruz `StorageService` too, but its R2 path (`R2Service`) is only wired in the **Workers entry** (`setR2Bucket`), not the **Pages SSR path** — so it threw "R2 bucket not configured." Reverted storage to `CloudflareContext.r2` (binding `STORAGE`), which reads the env binding directly and works. Closing that StorageService gap for the Pages path is a separate framework task.

### Follow-up 2: configurable AI provider + fix StorageService for Pages SSR

**Configurable AI provider.** AIService now picks its backend from the `AI_PROVIDER` env var (`getProvider()`):
- `workers-ai` — call the Workers AI binding (`env.AI`) directly.
- `gateway` — route through a custom Cloudflare AI Gateway (needs `CLOUDFLARE_ACCOUNT_ID` + `CF_AI_GATEWAY_ID` vars + `CF_AIG_TOKEN` secret).
- unset/`auto` — gateway if configured, else Workers AI. A `gateway` request that isn't configured warns and falls back.

`chat`, `chatMessages`, and `extractStructured` all route through the provider. Added `WORKERS_AI_MODEL_MAP` (small/medium → llama-3.1-8b, large → llama-3.3-70b-fp8-fast) alongside the gateway `MODEL_MAP` (Gemini). Demo sets `AI_PROVIDER: 'workers-ai'` in `ship-infra.ts` vars.

**Fixed StorageService on the Pages SSR path.** Root cause: `R2Service` only got its bucket via `setR2Bucket()`, which only the Workers entry calls — so in Pages SSR every method threw "R2 bucket not configured." Fix: `R2Service` now resolves the bucket through a `binding` getter that prefers an explicitly-set bucket and otherwise falls back to `CloudflareContext.r2` (the per-request Pages binding). PdfService switched back to `StorageService.disk()` for put/delete — no more raw R2 access in feature code.

Both verified live: upload (StorageService→R2), analysis + chat (AIService→Workers AI), all green.

### Verified live (cruzjs.pages.dev/pdfs)

Uploaded a generated test invoice PDF → `toMarkdown` correctly extracted vendor/amount/date → AI analysis produced a summary + "Invoice" type + key points → chat answered "The total amount due is USD 4200.00, and it is due on June 15, 2026" (grounded in the document). All bindings sourced via the infra abstraction.
