/**
 * DigitalOcean App Platform target adapter.
 *
 * IaC is a declarative App Spec YAML (deployable via `doctl apps` or the API).
 * Managed databases cover sql (PG/MySQL), cache (Valkey), pub-sub (Kafka) and
 * search (OpenSearch) via the `databases[].engine` enum. There is NO managed
 * queue, so the queue binding falls back to Valkey. Object storage (Spaces) is
 * not part of the app spec — it is wired via env/secret.
 */

import { stringify } from 'yaml';
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

export const digitaloceanManifest: CapabilityManifest = {
  target: 'digitalocean',
  capabilities: {
    sql: { native: { postgres: 'pg', mysql: 'mysql' }, services: ['pg', 'mysql'] },
    kv: { native: { '*': 'valkey' }, services: ['valkey', 'redis'] },
    // Spaces is S3-compatible object storage, but lives outside the app spec.
    blob: { native: { '*': 'spaces' } },
    // No managed queue on DO — fall back to Valkey (or Kafka for fan-out).
    queue: { native: { fanout: 'kafka' }, services: ['kafka', 'valkey'], fallback: 'valkey' },
    search: { native: { '*': 'opensearch' }, services: ['opensearch'] },
    vector: { fallback: 'opensearch' },
    cron: { native: { '*': 'scheduled-job' } },
    llm: {},
    email: {},
    realtime: {},
  },
  iac: { format: 'app-spec', emit: 'app.yaml' },
};

/** logical engine -> DO databases[].engine enum value. */
const DB_ENGINE: Record<string, string> = {
  pg: 'PG',
  mysql: 'MYSQL',
  valkey: 'VALKEY',
  redis: 'REDIS',
  kafka: 'KAFKA',
  opensearch: 'OPENSEARCH',
};

interface SpecDatabase {
  name: string;
  engine: string;
  production: boolean;
}
interface SpecJob {
  name: string;
  kind: string;
  schedule?: string;
}

function generate(resolved: ResolvedBinding[], ctx: GenContext): GeneratedArtifact {
  const databases: SpecDatabase[] = [];
  const jobs: SpecJob[] = [];
  const envs: Record<string, string> = {};
  const secrets: string[] = [];
  const warnings: string[] = [];

  for (const b of resolved) {
    if (b.sourcing === 'saas' || b.sourcing === 'external') {
      const secret = b.external?.ref?.replace(/^env:/, '') ?? connectionSecret(b.name);
      secrets.push(secret);
      warnings.push(`${b.type} "${b.name}": ${b.sourcing} — via secret ${secret}; not in app spec.`);
      continue;
    }

    switch (b.type) {
      case 'sql':
      case 'kv':
      case 'queue':
      case 'search': {
        const engine = DB_ENGINE[b.service ?? ''];
        if (!engine) {
          warnings.push(`${b.type} "${b.name}": no DO managed engine for "${b.service}"; skipped.`);
          break;
        }
        if (b.type === 'queue' && b.service === 'valkey') {
          warnings.push(`queue "${b.name}": DO has no managed queue; using Valkey as the message broker.`);
        }
        databases.push({ name: resourceName(ctx.app, ctx.env, b.name), engine, production: ctx.env === 'production' });
        break;
      }
      case 'blob': {
        // Spaces lives outside the app spec — wire bucket + credentials via env.
        envs[`${bindingVar(b.name)}_SPACES_BUCKET`] = resourceName(ctx.app, ctx.env, b.name);
        secrets.push('SPACES_ACCESS_KEY', 'SPACES_SECRET_KEY');
        warnings.push(`blob "${b.name}": DO Spaces is provisioned separately; wired via env + SPACES_* secrets.`);
        break;
      }
      case 'cron': {
        const schedules = Array.isArray(b.options.schedule)
          ? (b.options.schedule as string[])
          : b.options.schedule
            ? [String(b.options.schedule)]
            : [];
        if (!schedules.length) { warnings.push(`cron "${b.name}": no schedule; skipped.`); break; }
        for (const [i, s] of schedules.entries()) {
          jobs.push({ name: schedules.length > 1 ? `${b.name}-${i}` : b.name, kind: 'SCHEDULED', schedule: s });
        }
        break;
      }
      case 'llm':
      case 'email': {
        const secret = `${bindingVar(b.name)}_API_KEY`;
        secrets.push(secret);
        warnings.push(`${b.type} "${b.name}": no DO managed service; passthrough via ${secret}.`);
        break;
      }
      case 'vector':
        warnings.push(`vector "${b.name}": no native DO vector db; use OpenSearch or pgvector on the PG database.`);
        break;
      case 'realtime':
        warnings.push(`realtime "${b.name}": no managed DO realtime; run websockets in the app service.`);
        break;
    }
  }

  const spec: Record<string, unknown> = { name: ctx.app };
  if (databases.length) spec.databases = databases;
  if (jobs.length) spec.jobs = jobs;
  if (Object.keys(envs).length) {
    spec.envs = Object.entries(envs).map(([key, value]) => ({ key, value, scope: 'RUN_TIME' }));
  }

  return { files: [{ path: 'app.yaml', content: stringify(spec) }], secrets, warnings };
}

export const digitaloceanAdapter: TargetAdapter = { manifest: digitaloceanManifest, generate };
