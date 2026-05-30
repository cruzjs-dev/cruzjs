/**
 * Google Cloud target adapter (Cloud Run).
 *
 * The primary IaC artifact is a Knative Service manifest
 * (apiVersion: serving.knative.dev/v1) — this is the actual Cloud Run service
 * format. Knative only describes the compute service, so managed data resources
 * (Cloud SQL, Memorystore, GCS, Pub/Sub) are NOT expressed in the YAML; they are
 * provisioned out-of-band (see the provisioning layer) and wired into the
 * service via env. Each data binding contributes an env var + (for saas/secret)
 * a secret reference.
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

export const gcpManifest: CapabilityManifest = {
  target: 'gcp',
  capabilities: {
    sql: { native: { postgres: 'cloudsql-pg', mysql: 'cloudsql-mysql' }, services: ['cloudsql', 'alloydb'] },
    kv: { native: { '*': 'memorystore' }, services: ['memorystore'] },
    blob: { native: { '*': 'gcs' } },
    queue: { native: { work: 'pubsub', fanout: 'pubsub', '*': 'pubsub' }, services: ['pubsub'] },
    vector: { native: { '*': 'vertex-vector-search' }, fallback: 'pgvector' },
    search: { fallback: 'pgvector' },
    llm: { native: { '*': 'vertex-ai' } },
    email: {},
    cron: { native: { '*': 'cloud-scheduler' } },
    realtime: {},
  },
  iac: { format: 'knative', emit: 'service.yaml' },
};

interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: { secretKeyRef: { name: string; key: string } };
}

function generate(resolved: ResolvedBinding[], ctx: GenContext): GeneratedArtifact {
  const env: EnvVar[] = [];
  const secrets: string[] = [];
  const warnings: string[] = [];

  for (const b of resolved) {
    const V = bindingVar(b.name);
    if (b.sourcing === 'saas' || b.sourcing === 'external') {
      const secret = b.external?.ref?.replace(/^env:/, '') ?? connectionSecret(b.name);
      secrets.push(secret);
      env.push({ name: secret, valueFrom: { secretKeyRef: { name: secret, key: 'latest' } } });
      warnings.push(`${b.type} "${b.name}": ${b.sourcing} — wired via Secret Manager ${secret}.`);
      continue;
    }
    const rname = resourceName(ctx.app, ctx.env, b.name);
    switch (b.type) {
      case 'sql':
        env.push({ name: `${V}_INSTANCE`, value: rname });
        secrets.push(`${V}_URL`);
        env.push({ name: `${V}_URL`, valueFrom: { secretKeyRef: { name: `${V}_URL`, key: 'latest' } } });
        warnings.push(`sql "${b.name}": provision ${b.service} instance "${rname}" via gcloud; URL injected from Secret Manager.`);
        break;
      case 'kv':
        env.push({ name: `${V}_HOST`, value: `\${${V}_MEMORYSTORE_HOST}` });
        warnings.push(`kv "${b.name}": provision Memorystore "${rname}" via gcloud; host injected at deploy.`);
        break;
      case 'blob':
        env.push({ name: `${V}_BUCKET`, value: rname });
        warnings.push(`blob "${b.name}": create GCS bucket "${rname}" via gcloud/provisioning.`);
        break;
      case 'queue':
        env.push({ name: `${V}_TOPIC`, value: rname });
        warnings.push(`queue "${b.name}": create Pub/Sub topic "${rname}" via gcloud/provisioning.`);
        break;
      case 'vector':
        warnings.push(`vector "${b.name}": Vertex Vector Search index provisioned separately; wire endpoint via env.`);
        break;
      case 'cron': {
        const schedules = Array.isArray(b.options.schedule) ? b.options.schedule : b.options.schedule ? [b.options.schedule] : [];
        warnings.push(`cron "${b.name}": create Cloud Scheduler job(s) [${(schedules as string[]).join(', ')}] targeting the service URL.`);
        break;
      }
      case 'llm':
        warnings.push(`llm "${b.name}": Vertex AI — grant the service account aiplatform.user; no resource.`);
        break;
      case 'email':
        secrets.push(`${V}_API_KEY`);
        warnings.push(`email "${b.name}": no native GCP transactional email; passthrough via ${V}_API_KEY.`);
        break;
      case 'realtime':
        warnings.push(`realtime "${b.name}": run websockets in the Cloud Run service (HTTP/2); no managed service.`);
        break;
    }
  }

  const service = {
    apiVersion: 'serving.knative.dev/v1',
    kind: 'Service',
    metadata: { name: ctx.app },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image: `gcr.io/PROJECT_ID/${ctx.app}:latest`,
              env,
            },
          ],
        },
      },
    },
  };

  return { files: [{ path: 'service.yaml', content: stringify(service) }], secrets, warnings };
}

export const gcpAdapter: TargetAdapter = { manifest: gcpManifest, generate };
