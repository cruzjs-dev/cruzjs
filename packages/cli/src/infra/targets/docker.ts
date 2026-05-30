/**
 * Docker / self-hosted target adapter.
 *
 * Proves the `provider:'self'` sourcing axis: every provisionable binding maps
 * to a container in a generated docker-compose.yml. saas providers stay external
 * (connection via env); llm/email have no container and pass through.
 *
 * On this target `provider:'native'` and `provider:'self'` are equivalent — both
 * mean "a container you run" — since there is no managed cloud underneath.
 */

import { stringify } from 'yaml';
import type { CapabilityManifest } from '../manifest';
import type { ResolvedBinding } from '../resolver';
import {
  bindingVar,
  connectionSecret,
  type GenContext,
  type GeneratedArtifact,
  type TargetAdapter,
} from '../adapter';

export const dockerManifest: CapabilityManifest = {
  target: 'docker',
  capabilities: {
    sql: {
      native: { postgres: 'postgres', mysql: 'mysql', sqlite: 'postgres' },
      services: ['postgres', 'mysql'],
    },
    kv: { native: { '*': 'redis' }, services: ['redis', 'valkey'] },
    blob: { native: { '*': 'minio' }, services: ['minio'] },
    queue: { native: { work: 'rabbitmq', fanout: 'redis', '*': 'rabbitmq' }, services: ['rabbitmq', 'redis'] },
    vector: { native: { '*': 'qdrant' }, services: ['qdrant'] },
    search: { native: { '*': 'meilisearch' }, services: ['meilisearch'] },
    realtime: { native: { '*': 'redis' } },
    // No container for inference/email — passthrough to an external API.
    llm: {},
    email: {},
    cron: { native: { '*': 'ofelia' } },
  },
  iac: { format: 'compose', emit: 'docker-compose.yml' },
};

interface ServiceDef {
  image: string;
  environment?: Record<string, string>;
  ports?: string[];
  volumes?: string[];
  command?: string;
}

/** image + default wiring per container service id. */
const CONTAINERS: Record<string, (name: string) => ServiceDef> = {
  postgres: () => ({
    image: 'postgres:16-alpine',
    environment: { POSTGRES_USER: 'cruz', POSTGRES_PASSWORD: 'cruz', POSTGRES_DB: 'cruz' },
    ports: ['5432:5432'],
    volumes: ['pgdata:/var/lib/postgresql/data'],
  }),
  mysql: () => ({
    image: 'mysql:8',
    environment: { MYSQL_ROOT_PASSWORD: 'cruz', MYSQL_DATABASE: 'cruz' },
    ports: ['3306:3306'],
    volumes: ['mysqldata:/var/lib/mysql'],
  }),
  redis: () => ({ image: 'redis:7-alpine', ports: ['6379:6379'] }),
  valkey: () => ({ image: 'valkey/valkey:8-alpine', ports: ['6379:6379'] }),
  minio: () => ({
    image: 'minio/minio',
    command: 'server /data --console-address ":9001"',
    environment: { MINIO_ROOT_USER: 'cruz', MINIO_ROOT_PASSWORD: 'cruzcruz' },
    ports: ['9000:9000', '9001:9001'],
    volumes: ['miniodata:/data'],
  }),
  rabbitmq: () => ({ image: 'rabbitmq:3-management', ports: ['5672:5672', '15672:15672'] }),
  qdrant: () => ({ image: 'qdrant/qdrant', ports: ['6333:6333'], volumes: ['qdrantdata:/qdrant/storage'] }),
  meilisearch: () => ({ image: 'getmeili/meilisearch:v1.6', ports: ['7700:7700'], volumes: ['meilidata:/meili_data'] }),
  ofelia: () => ({ image: 'mcuadros/ofelia:latest', command: 'daemon --docker' }),
};

const NAMED_VOLUMES: Record<string, string[]> = {
  postgres: ['pgdata'],
  mysql: ['mysqldata'],
  minio: ['miniodata'],
  qdrant: ['qdrantdata'],
  meilisearch: ['meilidata'],
};

function generate(resolved: ResolvedBinding[], _ctx: GenContext): GeneratedArtifact {
  const services: Record<string, ServiceDef> = {};
  const volumes: Record<string, Record<string, never>> = {};
  const secrets: string[] = [];
  const warnings: string[] = [];

  for (const b of resolved) {
    if (b.sourcing === 'saas' || b.sourcing === 'external') {
      const secret = b.external?.ref?.replace(/^env:/, '') ?? connectionSecret(b.name);
      secrets.push(secret);
      warnings.push(`${b.type} "${b.name}": ${b.sourcing} — connect via env ${secret}; no container.`);
      continue;
    }
    if (b.type === 'llm' || b.type === 'email') {
      const secret = `${bindingVar(b.name)}_API_KEY`;
      secrets.push(secret);
      warnings.push(`${b.type} "${b.name}": no container; passthrough to external API via ${secret}.`);
      continue;
    }
    const svc = b.service;
    if (!svc || !CONTAINERS[svc]) {
      warnings.push(`${b.type} "${b.name}": no container mapping for "${svc}"; skipped.`);
      continue;
    }
    const serviceKey = `${b.name}`;
    services[serviceKey] = CONTAINERS[svc](b.name);
    for (const v of NAMED_VOLUMES[svc] ?? []) volumes[v] = {};
  }

  const compose: Record<string, unknown> = { services };
  if (Object.keys(volumes).length) compose.volumes = volumes;

  return {
    files: [{ path: 'docker-compose.yml', content: stringify(compose) }],
    secrets,
    warnings,
  };
}

export const dockerAdapter: TargetAdapter = { manifest: dockerManifest, generate };
