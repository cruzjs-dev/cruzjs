import type { TargetAdapter } from '../adapter';
import { cloudflareAdapter } from './cloudflare';
import { dockerAdapter } from './docker';
import { digitaloceanAdapter } from './digitalocean';
import { awsAdapter } from './aws';
import { gcpAdapter } from './gcp';
import { azureAdapter } from './azure';

export const TARGETS: Record<string, TargetAdapter> = {
  cloudflare: cloudflareAdapter,
  docker: dockerAdapter,
  digitalocean: digitaloceanAdapter,
  aws: awsAdapter,
  gcp: gcpAdapter,
  azure: azureAdapter,
};

export function getTarget(name: string): TargetAdapter {
  const t = TARGETS[name];
  if (!t) {
    throw new Error(
      `Unknown deploy target "${name}". Known: ${Object.keys(TARGETS).join(', ')}.`
    );
  }
  return t;
}

export {
  cloudflareAdapter,
  dockerAdapter,
  digitaloceanAdapter,
  awsAdapter,
  gcpAdapter,
  azureAdapter,
};
