/**
 * Target adapter contract.
 *
 * Every deployment target (cloudflare, aws, gcp, azure, digitalocean, docker)
 * implements this. The resolver is shared and cloud-agnostic; an adapter only:
 *   1. declares its capability `manifest`, and
 *   2. serializes resolved bindings into native IaC `files`.
 *
 * Provisioning (id writeback) and deploy orchestration consume the artifact
 * generically, so adding a target is "manifest + generate", nothing more.
 */

import type { CapabilityManifest } from './manifest';
import type { ResolvedBinding } from './resolver';

export interface GenContext {
  /** App name — prefix for resource names. */
  app: string;
  /** Environment name (production, staging, ...). */
  env: string;
  /** Plaintext vars merged into the generated config (e.g. wrangler [vars]). */
  vars?: Record<string, string>;
  /** Cloudflare/compat settings for the deploy envelope. */
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  /** Pages static output dir (Cloudflare Pages). */
  pagesBuildOutputDir?: string;
}

export interface EmittedFile {
  /** Path relative to .cruz/build/<env>-<target>/. */
  path: string;
  content: string;
}

export interface GeneratedArtifact {
  files: EmittedFile[];
  /** Secret names the deploy step must push to the target's secret store. */
  secrets: string[];
  warnings: string[];
}

export interface TargetAdapter {
  manifest: CapabilityManifest;
  generate(resolved: ResolvedBinding[], ctx: GenContext): GeneratedArtifact;
}

const SCREAMING_RE = /[^A-Z0-9]/g;

/** Conventional binding variable name: 'db' -> 'DB', 'my-cache' -> 'MY_CACHE'. */
export function bindingVar(name: string): string {
  if (name === 'db') return 'DB';
  return name.toUpperCase().replace(SCREAMING_RE, '_');
}

/** Default provisioned resource name: <app>-<env>-<binding>. */
export function resourceName(app: string, env: string, binding: string): string {
  return `${app}-${env}-${binding}`;
}

/** Secret name for a saas/external connection string: '<BINDING>_URL'. */
export function connectionSecret(name: string): string {
  return `${bindingVar(name)}_URL`;
}
