import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import type { InfraConfig } from '../bindings';
import { resolveBindings } from '../resolver';
import type { InfraState } from '../state';
import { getTarget, TARGETS } from '../targets/index';
import { planProvision, applyProvisionResults } from '../provisioner';
import { wranglerCreateArgs, parseWranglerId } from '../targets/cloudflare-exec';
import { markEjected, isEjected, filterEjected } from '../eject';

/** A representative SaaS config touching most binding categories. */
const SAAS: InfraConfig = {
  name: 'chatbase',
  bindings: {
    db: { type: 'sql', engine: 'postgres' },
    cache: { type: 'kv' },
    storage: { type: 'blob' },
    jobs: { type: 'queue', mode: 'work', fallback: { digitalocean: 'valkey', docker: 'rabbitmq' } },
    vectors: { type: 'vector', dims: 1536 },
    ai: { type: 'llm', provider: 'openrouter' },
    mail: { type: 'email', provider: 'resend' },
    cleanup: { type: 'cron', schedule: '0 * * * *' },
  },
};

function gen(target: string, config: InfraConfig = SAAS, state: InfraState | null = null) {
  const adapter = getTarget(target);
  const r = resolveBindings(config, adapter.manifest, state);
  const art = adapter.generate(filterEjected(r.bindings, state), { app: config.name, env: 'production' });
  return { r, art, file: art.files[0] };
}

describe('all six targets generate an artifact for the shared SaaS config', () => {
  it('registry has all six targets', () => {
    expect(Object.keys(TARGETS).sort()).toEqual(
      ['aws', 'azure', 'cloudflare', 'digitalocean', 'docker', 'gcp'].sort()
    );
  });

  for (const target of Object.keys(TARGETS)) {
    it(`${target}: produces a non-empty artifact, no build errors`, () => {
      const { r, file } = gen(target);
      expect(r.errors).toHaveLength(0);
      expect(file.content.length).toBeGreaterThan(0);
    });
  }
});

describe('cloudflare native mapping', () => {
  it('postgres sql warns (D1 is sqlite-only) and emits no d1 block', () => {
    const { r, art } = gen('cloudflare');
    const cfg = JSON.parse(art.files[0].content);
    expect(cfg.d1_databases).toBeUndefined();
    expect(r.warnings.join('\n')).toMatch(/no native sql on "cloudflare"/);
  });

  it('kv/blob/vector/queue map to native wrangler keys', () => {
    const { art } = gen('cloudflare');
    const cfg = JSON.parse(art.files[0].content);
    expect(cfg.kv_namespaces[0].binding).toBe('CACHE');
    expect(cfg.r2_buckets[0].bucket_name).toBe('chatbase-production-storage');
    expect(cfg.vectorize[0].dimensions).toBe(1536);
    expect(cfg.queues.producers[0].binding).toBe('JOBS');
  });

  it('openrouter llm + resend email are passthrough secrets', () => {
    const { art } = gen('cloudflare');
    expect(art.secrets).toEqual(expect.arrayContaining(['AI_API_KEY', 'MAIL_API_KEY']));
  });
});

describe('DOGFOOD: cloudflare adapter reproduces the real apps/demo prod bindings', () => {
  // Mirrors apps/demo wrangler.toml: D1 "DB", KV "CACHE_KV", AI "AI".
  const PROD: InfraConfig = {
    name: 'cruzjs',
    bindings: {
      db: { type: 'sql', engine: 'sqlite' },
      cache: { type: 'kv' },
      ai: { type: 'llm' },
    },
  };
  const state: InfraState = {
    target: 'cloudflare',
    env: 'production',
    bindings: {
      db: { managed: true, service: 'd1', resource: { name: 'cruzjs-production-db', id: 'e95285ce-01d2-4a98-9b09-eed14db2371b' } },
      cache: { managed: true, service: 'kv', resource: { id: '2794a65432f249d1ba56dff67a111c9a' } },
    },
  };

  it('emits D1 + KV with the committed prod ids and the AI binding', () => {
    const { art } = gen('cloudflare', PROD, state);
    const cfg = JSON.parse(art.files[0].content);
    expect(cfg.d1_databases[0]).toMatchObject({
      binding: 'DB',
      database_name: 'cruzjs-production-db',
      database_id: 'e95285ce-01d2-4a98-9b09-eed14db2371b',
    });
    expect(cfg.kv_namespaces[0]).toMatchObject({ binding: 'CACHE', id: '2794a65432f249d1ba56dff67a111c9a' });
    expect(cfg.ai).toMatchObject({ binding: 'AI' });
  });
});

describe('docker proves provider:self via containers', () => {
  it('emits postgres/redis/minio/rabbitmq/qdrant services + volumes', () => {
    const { art } = gen('docker');
    const compose = parseYaml(art.files[0].content);
    const images = Object.values(compose.services).map((s: any) => s.image);
    expect(images.some((i: string) => i.includes('postgres'))).toBe(true);
    expect(images.some((i: string) => i.includes('redis'))).toBe(true);
    expect(images.some((i: string) => i.includes('minio'))).toBe(true);
    expect(images.some((i: string) => i.includes('rabbitmq'))).toBe(true);
    expect(images.some((i: string) => i.includes('qdrant'))).toBe(true);
    expect(compose.volumes).toBeDefined();
  });
});

describe('digitalocean app spec + queue fallback', () => {
  it('maps managed engines and falls back to Valkey for the queue', () => {
    const { r, art } = gen('digitalocean');
    const spec = parseYaml(art.files[0].content);
    const engines = spec.databases.map((d: any) => d.engine);
    expect(engines).toEqual(expect.arrayContaining(['PG', 'VALKEY']));
    expect(r.warnings.join('\n')).toMatch(/no native queue.*fallback "valkey"/i);
    // cron → SCHEDULED job
    expect(spec.jobs.some((j: any) => j.kind === 'SCHEDULED')).toBe(true);
  });
});

describe('aws cdk + gcp knative + azure bicep shapes', () => {
  it('aws emits a CDK Stack subclass', () => {
    const { file } = gen('aws');
    expect(file.path).toBe('stack.ts');
    expect(file.content).toMatch(/extends Stack/);
    expect(file.content).toMatch(/aws-cdk-lib/);
  });
  it('gcp emits a Knative Service manifest', () => {
    const { file } = gen('gcp');
    const svc = parseYaml(file.content);
    expect(svc.apiVersion).toBe('serving.knative.dev/v1');
    expect(svc.kind).toBe('Service');
  });
  it('azure emits Bicep resources', () => {
    const { file } = gen('azure');
    expect(file.path).toBe('main.bicep');
    expect(file.content).toMatch(/resource .* '/);
  });
});

describe('provisioning plan + state writeback', () => {
  it('plans only managed, un-provisioned bindings and writes ids back', () => {
    const adapter = getTarget('cloudflare');
    const cfg: InfraConfig = { name: 'app', bindings: { db: { type: 'sql', engine: 'sqlite' }, cache: { type: 'kv' } } };
    const r = resolveBindings(cfg, adapter.manifest, null);
    const intents = planProvision(r.bindings, null);
    expect(intents.map((i) => i.binding).sort()).toEqual(['cache', 'db']);

    const prev: InfraState = { target: 'cloudflare', env: 'production', bindings: {} };
    const next = applyProvisionResults(prev, r.bindings, [
      { binding: 'db', resource: { name: 'app-production-db', id: 'd1-id' } },
      { binding: 'cache', resource: { name: 'app-production-cache', id: 'kv-id' } },
    ]);
    expect(next.bindings.db.resource?.id).toBe('d1-id');
    expect(next.bindings.cache.managed).toBe(true);

    // Re-plan with ids present → nothing to do.
    const r2 = resolveBindings(cfg, adapter.manifest, next);
    expect(planProvision(r2.bindings, next)).toHaveLength(0);
  });

  it('wrangler create args + id parsing', () => {
    expect(wranglerCreateArgs({ binding: 'db', type: 'sql', service: 'd1', name: 'app-db', options: {} })).toEqual(['d1', 'create', 'app-db']);
    expect(wranglerCreateArgs({ binding: 'c', type: 'kv', service: 'kv', name: 'app-kv', options: {} })).toEqual(['kv', 'namespace', 'create', 'app-kv']);
    expect(parseWranglerId('d1', 'database_id = "abc-123"')).toBe('abc-123');
    expect(parseWranglerId('kv', 'id = "deadbeef00"')).toBe('deadbeef00');
  });
});

describe('eject', () => {
  it('marks bindings unmanaged and filters them from codegen', () => {
    const state: InfraState = {
      target: 'cloudflare', env: 'production',
      bindings: { db: { managed: true, service: 'd1' }, cache: { managed: true, service: 'kv' } },
    };
    const ejected = markEjected(state, ['db']);
    expect(isEjected(ejected, 'db')).toBe(true);
    expect(isEjected(ejected, 'cache')).toBe(false);

    const adapter = getTarget('cloudflare');
    const cfg: InfraConfig = { name: 'app', bindings: { db: { type: 'sql', engine: 'sqlite' }, cache: { type: 'kv' } } };
    const r = resolveBindings(cfg, adapter.manifest, ejected);
    const active = filterEjected(r.bindings, ejected);
    expect(active.map((b) => b.name)).toEqual(['cache']);
  });
});
