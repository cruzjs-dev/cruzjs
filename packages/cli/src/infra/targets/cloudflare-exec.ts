/**
 * Cloudflare provisioning executor — wraps `wrangler` create commands and parses
 * the resource id out of their output. This is the impure counterpart to the
 * pure planner in provisioner.ts. Kept separate so tests inject a fake executor.
 */

import { execFileSync } from 'node:child_process';
import type { ProvisionExecutor, ProvisionIntent } from '../provisioner';

type Runner = (args: string[]) => string;

const defaultRunner: Runner = (args) =>
  execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8' });

/** Build the wrangler argv for a given provisioning intent. */
export function wranglerCreateArgs(intent: ProvisionIntent): string[] | null {
  switch (intent.service) {
    case 'd1':
      return ['d1', 'create', intent.name];
    case 'kv':
      return ['kv', 'namespace', 'create', intent.name];
    case 'r2':
      return ['r2', 'bucket', 'create', intent.name];
    case 'queues':
      return ['queues', 'create', intent.name];
    case 'vectorize':
      return [
        'vectorize',
        'create',
        intent.name,
        `--dimensions=${intent.options.dims ?? 768}`,
        '--metric=cosine',
      ];
    default:
      return null;
  }
}

/** Extract the provider id from wrangler create output. */
export function parseWranglerId(service: string, out: string): string {
  // D1: database_id = "uuid"; KV: id = "hex"; both appear as `id = "..."`.
  const idMatch = out.match(/(?:database_id|id)\s*=\s*"([^"]+)"/i);
  if (idMatch) return idMatch[1];
  // R2/Queues: no id, identified by name. Fall back to the resource name.
  const created = out.match(/['"]([0-9a-f-]{8,})['"]/i);
  return created?.[1] ?? '';
}

export function createCloudflareExecutor(runner: Runner = defaultRunner): ProvisionExecutor {
  return {
    target: 'cloudflare',
    async create(intent: ProvisionIntent) {
      const args = wranglerCreateArgs(intent);
      if (!args) {
        // Nothing to create (e.g. workers-ai/cron) — name-only binding.
        return { name: intent.name, id: '' };
      }
      const out = runner(args);
      return { name: intent.name, id: parseWranglerId(intent.service, out) };
    },
  };
}
