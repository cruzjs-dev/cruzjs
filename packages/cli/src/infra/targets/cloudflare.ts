/**
 * Cloudflare target adapter.
 *
 * Cloudflare's IaC is declarative (wrangler), so the rung-4 raw escape hatch is
 * an object deep-merged into the generated resource block. Native services map
 * 1:1 to wrangler keys; saas/external bindings produce secrets instead.
 */

import type { CapabilityManifest } from '../manifest';
import type { ResolvedBinding } from '../resolver';
import {
  bindingVar,
  connectionSecret,
  resourceName,
  type GenContext,
  type GeneratedArtifact,
  type TargetAdapter,
} from '../adapter';
import { applyRaw } from '../util';

export const cloudflareManifest: CapabilityManifest = {
  target: 'cloudflare',
  capabilities: {
    sql: { native: { sqlite: 'd1' }, services: ['d1'], scaleToZero: ['d1'] },
    kv: { native: { '*': 'kv' }, services: ['kv'] },
    blob: { native: { '*': 'r2' }, services: ['r2'] },
    queue: { native: { work: 'queues', '*': 'queues' }, services: ['queues'] },
    vector: { native: { '*': 'vectorize' }, services: ['vectorize'] },
    llm: { native: { '*': 'workers-ai' } },
    cron: { native: { '*': 'cron-triggers' } },
    realtime: { native: { '*': 'durable-objects' } },
    search: { fallback: 'd1-fts' },
    email: {},
  },
  iac: { format: 'wrangler', emit: 'wrangler.jsonc' },
};

type Cfg = Record<string, unknown>;
function push(cfg: Cfg, key: string, block: unknown): void {
  cfg[key] = [...((cfg[key] as unknown[]) ?? []), block];
}

interface Acc {
  cfg: Cfg;
  vars: Record<string, string>;
  secrets: string[];
  warnings: string[];
}

/** saas/external bindings never produce a wrangler resource — they wire a secret. */
function handleNonProvisioned(b: ResolvedBinding, acc: Acc): boolean {
  if (b.sourcing === 'saas') {
    const secret = connectionSecret(b.name);
    acc.secrets.push(secret);
    acc.warnings.push(
      `${b.type} "${b.name}": provider "${b.service}" — connect via secret ${secret}; no Cloudflare resource generated.`
    );
    return true;
  }
  if (b.sourcing === 'external') {
    if (b.external?.ref) acc.secrets.push(b.external.ref.replace(/^env:/, ''));
    acc.warnings.push(`${b.type} "${b.name}": external resource — not provisioned by cruz.`);
    return true;
  }
  if (b.sourcing === 'self') {
    acc.warnings.push(
      `${b.type} "${b.name}": provider:'self' has no Cloudflare equivalent; use native or a saas provider.`
    );
    return true;
  }
  return false;
}

function genSql(b: ResolvedBinding, ctx: GenContext, acc: Acc): void {
  if (handleNonProvisioned(b, acc)) return;
  if (b.service !== 'd1') {
    acc.warnings.push(`sql "${b.name}": Cloudflare native sql is D1 only (got "${b.service}"); skipped.`);
    return;
  }
  const block = applyRaw(
    {
      binding: bindingVar(b.name),
      database_name: b.resource?.name ?? resourceName(ctx.app, ctx.env, b.name),
      database_id: b.resource?.id ?? '',
      migrations_dir: './src/database/migrations',
    },
    b.raw
  );
  push(acc.cfg, 'd1_databases', block);
}

function genKv(b: ResolvedBinding, _ctx: GenContext, acc: Acc): void {
  if (handleNonProvisioned(b, acc)) return;
  const block = applyRaw(
    { binding: bindingVar(b.name), id: b.resource?.id ?? '' },
    b.raw
  );
  push(acc.cfg, 'kv_namespaces', block);
}

function genBlob(b: ResolvedBinding, ctx: GenContext, acc: Acc): void {
  if (handleNonProvisioned(b, acc)) return;
  const block = applyRaw(
    {
      binding: bindingVar(b.name),
      bucket_name: b.resource?.name ?? resourceName(ctx.app, ctx.env, b.name),
    },
    b.raw
  );
  push(acc.cfg, 'r2_buckets', block);
}

function genQueue(b: ResolvedBinding, ctx: GenContext, acc: Acc): void {
  if (handleNonProvisioned(b, acc)) return;
  if (b.options.mode === 'fanout') {
    acc.warnings.push(
      `queue "${b.name}": Cloudflare Queues is point-to-point; mode:'fanout' degrades to work-queue.`
    );
  }
  const queue = b.resource?.name ?? resourceName(ctx.app, ctx.env, b.name);
  const queues = (acc.cfg.queues as { producers?: unknown[]; consumers?: unknown[] }) ?? {};
  queues.producers = [
    ...(queues.producers ?? []),
    applyRaw({ binding: bindingVar(b.name), queue }, b.raw),
  ];
  queues.consumers = [
    ...(queues.consumers ?? []),
    { queue, max_batch_size: 10, max_batch_timeout: 30 },
  ];
  acc.cfg.queues = queues;
}

function genVector(b: ResolvedBinding, ctx: GenContext, acc: Acc): void {
  if (handleNonProvisioned(b, acc)) return;
  const block = applyRaw(
    {
      binding: bindingVar(b.name),
      index_name: b.resource?.name ?? resourceName(ctx.app, ctx.env, b.name),
      dimensions: b.options.dims ?? 768,
    },
    b.raw
  );
  push(acc.cfg, 'vectorize', block);
}

function genLlm(b: ResolvedBinding, _ctx: GenContext, acc: Acc): void {
  if (b.sourcing === 'native') {
    acc.cfg.ai = applyRaw({ binding: 'AI' }, b.raw);
    return;
  }
  // saas passthrough (openrouter/openai/anthropic) — API key secret.
  const secret = `${bindingVar(b.name)}_API_KEY`;
  acc.secrets.push(secret);
  acc.vars[`${bindingVar(b.name)}_PROVIDER`] = b.service ?? 'unknown';
  acc.warnings.push(`llm "${b.name}": provider "${b.service}" via secret ${secret}.`);
}

function genEmail(b: ResolvedBinding, _ctx: GenContext, acc: Acc): void {
  // Cloudflare has no native transactional email — always passthrough.
  // Default to MailChannels (free for Workers) when sourcing is native.
  const provider = b.sourcing === 'native' ? 'mailchannels' : (b.service ?? 'mailchannels');
  acc.vars.EMAIL_PROVIDER = provider;
  if (provider !== 'mailchannels') {
    const secret = `${bindingVar(b.name)}_API_KEY`;
    acc.secrets.push(secret);
    acc.warnings.push(`email "${b.name}": provider "${provider}" via secret ${secret}.`);
  }
}

function genCron(b: ResolvedBinding, _ctx: GenContext, acc: Acc): void {
  const schedules = Array.isArray(b.options.schedule)
    ? (b.options.schedule as string[])
    : b.options.schedule
      ? [String(b.options.schedule)]
      : [];
  if (!schedules.length) {
    acc.warnings.push(`cron "${b.name}": no schedule provided; nothing generated.`);
    return;
  }
  const existing = ((acc.cfg.triggers as Cfg)?.crons as string[]) ?? [];
  acc.cfg.triggers = { crons: [...existing, ...schedules] };
}

function genRealtime(b: ResolvedBinding, _ctx: GenContext, acc: Acc): void {
  if (handleNonProvisioned(b, acc)) return;
  const block = applyRaw(
    { name: bindingVar(b.name), class_name: `${bindingVar(b.name)}DurableObject` },
    b.raw
  );
  const dos = ((acc.cfg.durable_objects as Cfg)?.bindings as unknown[]) ?? [];
  dos.push(block);
  acc.cfg.durable_objects = { bindings: dos };
}

const GENERATORS: Record<
  string,
  (b: ResolvedBinding, ctx: GenContext, acc: Acc) => void
> = {
  sql: genSql,
  kv: genKv,
  blob: genBlob,
  queue: genQueue,
  vector: genVector,
  llm: genLlm,
  email: genEmail,
  cron: genCron,
  realtime: genRealtime,
};

function generate(resolved: ResolvedBinding[], ctx: GenContext): GeneratedArtifact {
  const acc: Acc = { cfg: { name: ctx.app }, vars: {}, secrets: [], warnings: [] };

  // Deploy envelope (compat + Pages output dir) emitted before bindings.
  if (ctx.compatibilityDate) acc.cfg.compatibility_date = ctx.compatibilityDate;
  if (ctx.compatibilityFlags?.length) acc.cfg.compatibility_flags = ctx.compatibilityFlags;
  if (ctx.pagesBuildOutputDir) acc.cfg.pages_build_output_dir = ctx.pagesBuildOutputDir;
  Object.assign(acc.vars, ctx.vars ?? {});

  for (const b of resolved) {
    const gen = GENERATORS[b.type];
    if (gen) gen(b, ctx, acc);
    else acc.warnings.push(`${b.type} "${b.name}": no Cloudflare generator; skipped.`);
  }
  if (Object.keys(acc.vars).length) acc.cfg.vars = acc.vars;
  return {
    files: [{ path: 'wrangler.jsonc', content: JSON.stringify(acc.cfg, null, 2) + '\n' }],
    secrets: acc.secrets,
    warnings: acc.warnings,
  };
}

export const cloudflareAdapter: TargetAdapter = {
  manifest: cloudflareManifest,
  generate,
};
