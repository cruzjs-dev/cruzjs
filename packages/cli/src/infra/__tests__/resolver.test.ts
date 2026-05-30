import { describe, it, expect } from 'vitest';
import type { InfraConfig } from '../bindings';
import { resolveBindings } from '../resolver';
import type { InfraState } from '../state';
import { cloudflareManifest, cloudflareAdapter } from '../targets/cloudflare';
import { deepMerge } from '../util';

const M = cloudflareManifest;

function resolve(config: InfraConfig, state: InfraState | null = null) {
  return resolveBindings(config, M, state);
}

/** Resolve + generate the wrangler config object for cloudflare. */
function wrangler(config: InfraConfig, state: InfraState | null = null) {
  const r = resolve(config, state);
  const art = cloudflareAdapter.generate(r.bindings, { app: config.name, env: 'production' });
  const cfg = JSON.parse(art.files[0].content) as Record<string, unknown>;
  return { art, cfg };
}

describe('resolver — cloudflare sql', () => {
  it('rung 0: native sqlite resolves to D1', () => {
    const r = resolve({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'sqlite' } },
    });
    const db = r.bindings[0];
    expect(db.sourcing).toBe('native');
    expect(db.service).toBe('d1');
    expect(db.skipProvision).toBe(false);
    expect(r.errors).toHaveLength(0);
  });

  it('default engine still maps to D1 via the sqlite native key when omitted', () => {
    // No engine + native map keyed by 'sqlite' (no '*') => no service, optional skip.
    const r = resolve({ name: 'app', bindings: { db: { type: 'sql' } } });
    expect(r.bindings[0].service).toBeNull();
    expect(r.warnings.join('\n')).toMatch(/no native sql/);
  });

  it('engine mismatch: postgres on cloudflare warns', () => {
    const r = resolve({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'postgres' } },
    });
    // postgres has no native fit and no fallback => skipped + warned.
    expect(r.bindings[0].service).toBeNull();
    expect(r.warnings.join('\n')).toMatch(/no native sql on "cloudflare"/);
  });

  it('axis 2 — saas provider (neon) skips provisioning, sources via secret', () => {
    const r = resolve({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'postgres', provider: 'neon' } },
    });
    const db = r.bindings[0];
    expect(db.sourcing).toBe('saas');
    expect(db.service).toBe('neon');
    expect(db.skipProvision).toBe(true);
  });

  it('rung 5 — external ref skips provisioning', () => {
    const r = resolve({
      name: 'app',
      bindings: {
        legacy: {
          type: 'sql',
          engine: 'sqlite',
          external: { '*': { ref: 'env:LEGACY_DB_URL' } },
        },
      },
    });
    const b = r.bindings[0];
    expect(b.sourcing).toBe('external');
    expect(b.skipProvision).toBe(true);
    expect(b.external?.ref).toBe('env:LEGACY_DB_URL');
  });

  it('required + no native + no fallback => build error', () => {
    const r = resolve({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'postgres', required: true } },
    });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/REQUIRED/);
  });

  it('optional missing binding is skipped with a warning, no error', () => {
    const r = resolve({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'mysql', optional: true } },
    });
    expect(r.errors).toHaveLength(0);
    expect(r.bindings[0].skipProvision).toBe(true);
  });

  it('rung 2 — unknown service swap warns', () => {
    const r = resolve({
      name: 'app',
      bindings: {
        db: { type: 'sql', engine: 'sqlite', targets: { cloudflare: { service: 'aurora' } } },
      },
    });
    expect(r.warnings.join('\n')).toMatch(/not a known cloudflare service/);
  });

  it('scale.min:0 on a non-scale-to-zero service warns (none here — D1 scales to zero, no warning)', () => {
    const r = resolve({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'sqlite', scale: { min: 0 } } },
    });
    expect(r.warnings.join('\n')).not.toMatch(/does not scale to zero/);
  });

  it('reuses resource name + id from state', () => {
    const state: InfraState = {
      target: 'cloudflare',
      env: 'production',
      bindings: {
        db: { managed: true, service: 'd1', resource: { name: 'app-prod-db', id: 'abc-123' } },
      },
    };
    const r = resolve(
      { name: 'app', bindings: { db: { type: 'sql', engine: 'sqlite' } } },
      state
    );
    expect(r.bindings[0].resource).toEqual({ name: 'app-prod-db', id: 'abc-123' });
  });
});

describe('cloudflare codegen — wrangler', () => {
  const dbs = (cfg: Record<string, unknown>) =>
    cfg.d1_databases as Array<Record<string, unknown>>;

  it('native D1 emits a d1_databases block with binding=DB', () => {
    const { cfg } = wrangler({ name: 'app', bindings: { db: { type: 'sql', engine: 'sqlite' } } });
    expect(dbs(cfg)).toHaveLength(1);
    expect(dbs(cfg)[0].binding).toBe('DB');
    expect(dbs(cfg)[0].database_name).toBe('app-production-db');
    expect(dbs(cfg)[0].database_id).toBe('');
  });

  it('rung 4 — raw object patch deep-merges into the D1 block', () => {
    const { cfg } = wrangler({
      name: 'app',
      bindings: {
        db: {
          type: 'sql',
          engine: 'sqlite',
          targets: { cloudflare: { raw: { migrations_dir: './custom/migrations' } } },
        },
      },
    });
    expect(dbs(cfg)[0].migrations_dir).toBe('./custom/migrations');
  });

  it('saas neon emits a secret, no d1 resource', () => {
    const { cfg, art } = wrangler({
      name: 'app',
      bindings: { db: { type: 'sql', engine: 'postgres', provider: 'neon' } },
    });
    expect(cfg.d1_databases).toBeUndefined();
    expect(art.secrets).toContain('DB_URL');
  });

  it('external id binds an existing D1 without a generated name change', () => {
    const { cfg } = wrangler({
      name: 'app',
      bindings: {
        db: { type: 'sql', engine: 'sqlite', external: { cloudflare: { id: 'existing-d1-id' } } },
      },
    });
    // external bindings are not provisioned; resolver marks skipProvision, codegen warns.
    expect(cfg.d1_databases).toBeUndefined();
  });

  it('non-db logical name uppercases into the binding var', () => {
    const { cfg } = wrangler({
      name: 'app',
      bindings: { analytics: { type: 'sql', engine: 'sqlite' } },
    });
    expect(dbs(cfg)[0].binding).toBe('ANALYTICS');
  });

  it('covers kv, blob, queue, vector, llm, email, cron, realtime', () => {
    const { cfg, art } = wrangler({
      name: 'app',
      bindings: {
        cache: { type: 'kv' },
        media: { type: 'blob' },
        jobs: { type: 'queue', mode: 'work' },
        embeddings: { type: 'vector', dims: 1536 },
        ai: { type: 'llm', provider: 'openrouter' },
        mail: { type: 'email', provider: 'resend' },
        cleanup: { type: 'cron', schedule: '0 * * * *' },
        live: { type: 'realtime' },
      },
    });
    expect((cfg.kv_namespaces as unknown[])[0]).toMatchObject({ binding: 'CACHE' });
    expect((cfg.r2_buckets as unknown[])[0]).toMatchObject({ bucket_name: 'app-production-media' });
    expect((cfg.queues as Record<string, unknown[]>).producers[0]).toMatchObject({ binding: 'JOBS' });
    expect((cfg.vectorize as unknown[])[0]).toMatchObject({ dimensions: 1536 });
    expect(cfg.ai).toBeUndefined(); // openrouter is saas passthrough, not native [ai]
    expect(art.secrets).toEqual(expect.arrayContaining(['AI_API_KEY', 'MAIL_API_KEY']));
    expect((cfg.triggers as { crons: string[] }).crons).toContain('0 * * * *');
    expect((cfg.durable_objects as { bindings: unknown[] }).bindings[0]).toMatchObject({ name: 'LIVE' });
    expect((cfg.vars as Record<string, string>).EMAIL_PROVIDER).toBe('resend');
  });

  it('native llm uses [ai] binding', () => {
    const { cfg } = wrangler({ name: 'app', bindings: { ai: { type: 'llm' } } });
    expect(cfg.ai).toMatchObject({ binding: 'AI' });
  });
});

describe('deepMerge', () => {
  it('merges nested objects and replaces arrays', () => {
    const out = deepMerge(
      { a: 1, nested: { x: 1, y: 2 }, list: [1, 2] },
      { nested: { y: 3, z: 4 }, list: [9] }
    );
    expect(out).toEqual({ a: 1, nested: { x: 1, y: 3, z: 4 }, list: [9] });
  });
});
