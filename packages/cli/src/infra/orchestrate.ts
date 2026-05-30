/**
 * Orchestrator — ties the infra pipeline together for a (config, target, env):
 *   resolve -> negotiate -> drop ejected -> [provision + writeback] -> generate
 *   -> emit artifact files to .cruz/build/<env>-<target>/.
 *
 * This is the single entry point the CLI (`cruz infra ...`) and the deploy hook
 * call. Provisioning is opt-in via an injected executor; without one, codegen
 * runs against whatever ids already exist in state (empty => create-on-deploy).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GeneratedArtifact } from './adapter';
import type { InfraConfig } from './bindings';
import { resolveBindings, type ResolveResult } from './resolver';
import { readState, type InfraState } from './state';
import { filterEjected } from './eject';
import { provision, type ProvisionExecutor, type ProvisionIntent } from './provisioner';
import { getTarget } from './targets/index';

export interface CompileOptions {
  rootDir: string;
  config: InfraConfig;
  target: string;
  env: string;
  /** When provided, missing resources are created and ids written to state. */
  executor?: ProvisionExecutor;
  /** Extra deploy-envelope settings forwarded to the target's generate(). */
  gen?: {
    vars?: Record<string, string>;
    compatibilityDate?: string;
    compatibilityFlags?: string[];
    pagesBuildOutputDir?: string;
  };
}

export interface CompileOutcome {
  target: string;
  env: string;
  resolve: ResolveResult;
  artifact: GeneratedArtifact;
  /** Absolute paths of files written under .cruz/build/<env>-<target>/. */
  written: string[];
  provisioned: ProvisionIntent[];
  state: InfraState | null;
}

export function buildDir(rootDir: string, env: string, target: string): string {
  return join(rootDir, '.cruz', 'build', `${env}-${target}`);
}

export async function compileInfra(opts: CompileOptions): Promise<CompileOutcome> {
  const { rootDir, config, target, env } = opts;
  const adapter = getTarget(target);

  let state = readState(rootDir, env, target);
  let resolve = resolveBindings(config, adapter.manifest, state);

  if (resolve.errors.length) {
    throw new Error(
      `infra resolution failed for target "${target}":\n  - ${resolve.errors.join('\n  - ')}`
    );
  }

  let provisioned: ProvisionIntent[] = [];
  if (opts.executor) {
    const active = filterEjected(resolve.bindings, state);
    const result = await provision(rootDir, env, active, opts.executor);
    state = result.state;
    provisioned = result.intents;
    // Re-resolve so codegen picks up freshly written resource ids.
    resolve = resolveBindings(config, adapter.manifest, state);
  }

  const active = filterEjected(resolve.bindings, state);
  const artifact = adapter.generate(active, { app: config.name, env, ...opts.gen });

  const dir = buildDir(rootDir, env, target);
  const written: string[] = [];
  for (const file of artifact.files) {
    const path = join(dir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content, 'utf8');
    written.push(path);
  }

  return { target, env, resolve, artifact, written, provisioned, state };
}
