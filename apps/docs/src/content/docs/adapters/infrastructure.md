---
title: Infrastructure Abstraction (IaC)
description: How CruzJS compiles logical bindings into per-cloud infrastructure-as-code.
---

CruzJS describes infrastructure with **logical bindings** — `sql`, `kv`, `blob`,
`queue`, `llm`, and so on — instead of naming a cloud service. A target adapter
resolves each binding into a concrete native service and emits the matching
infrastructure-as-code artifact (today: a Cloudflare `wrangler.jsonc`). This is
the engine behind the [multi-cloud roadmap](/adapters/overview): the same config
is meant to compile onto different clouds without touching application code.

Implementation lives in `packages/cli/src/infra/`.

## Logical bindings

A binding declares *a capability the app needs*, not a product. The supported
binding types:

| Type | Capability | Cloudflare native |
|------|-----------|-------------------|
| `sql` | Relational database | D1 |
| `kv` | Key-value cache | KV |
| `blob` | Object storage | R2 |
| `queue` | Async messaging (`work` or `fanout`) | Queues |
| `vector` | Vector index (`dims`) | Vectorize |
| `search` | Full-text search | FTS5 (D1) |
| `cron` | Scheduled jobs (`schedule`) | Cron Triggers |
| `realtime` | Websockets / pub-sub | Durable Objects |
| `llm` | AI inference | Workers AI |
| `email` | Transactional email | — (provider) |

A minimal config — target-agnostic:

```typescript
const config: InfraConfig = {
  name: 'cruzjs',
  bindings: {
    db: { type: 'sql', engine: 'sqlite' },
    cache_kv: { type: 'kv' },
    storage: { type: 'blob' },
    ai: { type: 'llm' },
  },
};
```

The logical name (`db`, `cache_kv`, …) becomes the binding variable the runtime
reads. `cache_kv` → `CACHE_KV`, `storage` → `STORAGE`, etc.

## The escape-hatch ladder (rungs 0–5)

Most apps only need rung 0. The higher rungs are there when you need to reach
past the abstraction — without abandoning it. Each rung is an optional field on
the binding spec (`bindings.ts`):

| Rung | Name | Field | What it does |
|------|------|-------|--------------|
| 0 | Logical | `type` + `engine` | Declare the capability. |
| 1 | Portable tuning | `size`, `scale`, `region`, `dims`, `schedule`, `mode` | Cloud-neutral knobs (e.g. `scale: { min: 0 }` for scale-to-zero intent). |
| 2 | Service swap | `targets.<t>.service` | Pick a different native service within a cloud. |
| 3 | Native knobs | `targets.<t>.options` | Service-specific options merged onto the resolved resource. |
| 4 | Raw patch | `targets.<t>.raw` | Raw IaC merged into the generated output. Declarative targets take an object (deep-merged); imperative targets take a mutator function. |
| 5 | BYO resource | `external.<t>` | Point at an existing resource; the adapter binds but does **not** provision it. |

Example climbing to rung 4 (point D1 at a dialect-specific migrations dir):

```typescript
db: {
  type: 'sql',
  engine: 'sqlite',
  targets: {
    cloudflare: { raw: { migrations_dir: './src/database/migrations/sqlite' } },
  },
},
```

A second axis, **sourcing** (`provider`), is orthogonal to the target: `'native'`
(the cloud's own service, default), `'self'` (a container you run), or a SaaS
name like `'neon'` / `'upstash'`.

## Compile flow

`compileInfra()` (`orchestrate.ts`) takes an `InfraConfig` + a target + an env and
runs:

```
resolve → negotiate → [provision] → generate → emit
```

- **resolve** (`resolver.ts`) — reconcile each binding against the target's
  `CapabilityManifest`. Decide the native service, apply rung 1/3 tuning and the
  rung 4 raw patch, and record a `sourcing` of `native | saas | self | external`.
- **negotiate** — a `required` binding with no fit fails the build; an `optional`
  one is skipped with a warning; a `fallback` map supplies an alternative.
- **generate** — the adapter's `generate()` serializes resolved bindings into IaC.
- **emit** — artifacts written to `.cruz/build/<env>-<target>/`.

## State

Provisioned resource ids are persisted to `.cruz/state/<env>-<target>.json`
(`state.ts`) so redeploys **reuse** rather than recreate. Each binding tracks:

- `managed` — `false` means ejected / externally owned.
- `service` — resolved service id (`d1`, `kv`, …).
- `resource` — `{ name?, id? }` of the provisioned resource.

## Target adapters

Each target implements a `TargetAdapter` (`adapter.ts`): a `CapabilityManifest`
declaring which native service backs each binding type, plus a `generate()`
function. Cloudflare is the only target wired end-to-end today; AWS (CDK), GCP
(Cloud Run), Azure (Bicep), DigitalOcean (App Spec), and Docker (compose) are
[roadmap targets](/adapters/overview).

The Cloudflare manifest (`targets/cloudflare.ts`):

```typescript
capabilities: {
  sql:  { native: { sqlite: 'd1' }, services: ['d1'] },
  kv:   { native: { '*': 'kv' } },
  blob: { native: { '*': 'r2' } },
  llm:  { native: { '*': 'workers-ai' } },
}
iac: { format: 'wrangler', emit: 'wrangler.jsonc' }
```

## Worked example

`apps/demo/scripts/ship-infra.ts` drives the whole pipeline for the demo app:

```typescript
// 1. Seed state with the existing prod resource ids (reuse, don't recreate).
writeState(rootDir, {
  target: 'cloudflare',
  env: 'production',
  bindings: {
    db:       { managed: true, service: 'd1', resource: { id: 'e95285ce-…' } },
    cache_kv: { managed: true, service: 'kv', resource: { id: '2794a654…' } },
    storage:  { managed: true, service: 'r2', resource: { name: 'cruzjs-production-docs' } },
  },
});

// 2. Logical, target-agnostic bindings.
const config: InfraConfig = {
  name: 'cruzjs',
  bindings: {
    db:       { type: 'sql', engine: 'sqlite',
                targets: { cloudflare: { raw: { migrations_dir: './src/database/migrations/sqlite' } } } },
    cache_kv: { type: 'kv' },
    storage:  { type: 'blob' },
    ai:       { type: 'llm' },
  },
};

// 3. Compile for Cloudflare → wrangler.jsonc.
const out = await compileInfra({ rootDir, config, target: 'cloudflare', env: 'production', gen: { /* … */ } });
writeFileSync('wrangler.jsonc', out.artifact.files.find((f) => f.path === 'wrangler.jsonc').content);
```

The resolver maps `blob → r2`, `kv → kv`, `sql(sqlite) → d1`, `llm → workers-ai`,
and emits a `wrangler.jsonc` with the matching `d1_databases`, `kv_namespaces`,
`r2_buckets`, and `[ai]` blocks — reusing the seeded ids.
