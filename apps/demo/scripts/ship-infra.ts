/**
 * Ship apps/demo to Cloudflare USING THE NEW INFRA ABSTRACTION.
 *
 * Drives packages/cli/src/infra: seeds state with the existing prod D1/KV ids
 * (so we reuse, not recreate), resolves the logical bindings for the cloudflare
 * target, and generates a deployable wrangler.jsonc. Run from apps/demo with tsx.
 *
 *   npx tsx scripts/ship-infra.ts        # generate .cruz/build + wrangler.jsonc
 */

import { writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { InfraConfig } from '../../../packages/cli/src/infra/bindings';
import { compileInfra } from '../../../packages/cli/src/infra/orchestrate';
import { writeState } from '../../../packages/cli/src/infra/state';

const rootDir = process.cwd(); // apps/demo
const env = 'production';

// 1. Seed state with the EXISTING provisioned prod resources (reuse, don't recreate).
writeState(rootDir, {
  target: 'cloudflare',
  env,
  bindings: {
    db: {
      managed: true,
      service: 'd1',
      resource: { name: 'cruzjs-production-db', id: 'e95285ce-01d2-4a98-9b09-eed14db2371b' },
    },
    // Logical name chosen so bindingVar() => "CACHE_KV", which the Cloudflare
    // runtime adapter expects for cache/sessions/rate-limit/scheduler/broadcast.
    cache_kv: {
      managed: true,
      service: 'kv',
      resource: { id: '2794a65432f249d1ba56dff67a111c9a' },
    },
    // Logical name "storage" => bindingVar "STORAGE", which CloudflareContext.r2
    // resolves (UPLOADS_BUCKET || STORAGE). Backs the PDF upload feature.
    storage: {
      managed: true,
      service: 'r2',
      resource: { name: 'cruzjs-production-docs' },
    },
  },
});

// 2. Logical, target-agnostic bindings (mirrors the real app: D1 + KV + Workers AI).
const config: InfraConfig = {
  name: 'cruzjs',
  bindings: {
    db: {
      type: 'sql',
      engine: 'sqlite',
      // rung-4 raw escape hatch: point D1 at the dialect-specific migrations dir.
      targets: { cloudflare: { raw: { migrations_dir: './src/database/migrations/sqlite' } } },
    },
    cache_kv: { type: 'kv' }, // bindingVar => CACHE_KV (runtime adapter expects this)
    storage: { type: 'blob' }, // bindingVar => STORAGE → R2 bucket (PDF uploads)
    ai: { type: 'llm' }, // native → wrangler [ai] binding
  },
};

const out = await compileInfra({
  rootDir,
  config,
  target: 'cloudflare',
  env,
  gen: {
    compatibilityDate: '2024-12-01',
    compatibilityFlags: ['nodejs_compat'],
    pagesBuildOutputDir: './dist/client',
    vars: {
      APP_NAME: 'CruzJS',
      APP_URL: 'https://cruzjs.pages.dev',
      // AI provider selector consumed by AIService.getProvider():
      //   'workers-ai' = call the Workers AI binding directly (no gateway).
      //   'gateway'    = route through a custom AI Gateway (also set
      //                  CLOUDFLARE_ACCOUNT_ID + CF_AI_GATEWAY_ID vars and the
      //                  CF_AIG_TOKEN secret, then flip this to 'gateway').
      AI_PROVIDER: 'workers-ai',
      CF_AI_GATEWAY_ID: 'cruzjs',
      EMAIL_PROVIDER: 'mailchannels',
      NODE_ENV: 'production',
    },
  },
});

// 3. Write the generated config to the location wrangler deploys from.
const wranglerJsonc = out.artifact.files.find((f) => f.path === 'wrangler.jsonc')!;
writeFileSync(resolve(rootDir, 'wrangler.jsonc'), wranglerJsonc.content, 'utf8');

console.log('── infra abstraction output ──────────────────────────────');
console.log('binding bindings resolved:');
for (const b of out.resolve.bindings) {
  console.log(`  ${b.name.padEnd(8)} ${b.type.padEnd(6)} -> ${b.sourcing}:${b.service ?? '-'}`);
}
if (out.resolve.warnings.length) console.log('warnings:\n  ' + out.resolve.warnings.join('\n  '));
console.log('\nwrote wrangler.jsonc:\n');
console.log(wranglerJsonc.content);
console.log(`build artifacts: ${out.written.join(', ')}`);

// 4. Bundle the Cloudflare Pages SSR worker (mirrors cli bundlePagesWorker):
//    copy the react-router server build into dist/client and emit _worker.js.
const distClient = resolve(rootDir, 'dist/client');
const distServer = resolve(rootDir, 'dist/server');
if (!existsSync(resolve(distServer, 'index.js'))) {
  throw new Error('dist/server/index.js missing — run `react-router build` first.');
}
copyFileSync(resolve(distServer, 'index.js'), resolve(distClient, '_server.js'));
const serverAssets = resolve(distServer, 'assets');
if (existsSync(serverAssets)) {
  for (const f of readdirSync(serverAssets)) {
    copyFileSync(resolve(serverAssets, f), resolve(distClient, 'assets', f));
  }
}
const WORKER_JS = `import { createRequestHandler } from "@react-router/cloudflare";
import * as serverBuild from "./_server.js";

const requestHandler = createRequestHandler({ build: serverBuild, mode: "production" });

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === "GET" && env.ASSETS) {
        try {
          const assetResponse = await env.ASSETS.fetch(request.url, { headers: request.headers });
          if (assetResponse.status >= 200 && assetResponse.status < 400) return assetResponse;
        } catch {}
      }
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx), passThroughOnException: ctx.passThroughOnException?.bind(ctx) || (() => {}) };
      return await requestHandler(context);
    } catch (error) {
      console.error("[Worker] Error:", error.message || error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};`;
writeFileSync(resolve(distClient, '_worker.js'), WORKER_JS, 'utf8');
console.log('bundled Pages SSR worker: dist/client/_worker.js + _server.js');
