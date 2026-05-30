/**
 * Per-environment, per-target infra state.
 *
 * Records which logical bindings are cruz-managed and the provisioned resource
 * ids, so subsequent deploys reuse the same resources. Committed to the repo at
 * .cruz/state/<env>-<target>.json. Ejected/external bindings carry managed:false.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface BindingState {
  /** false => cruz no longer provisions this (ejected or external). */
  managed: boolean;
  service?: string;
  resource?: { name?: string; id?: string };
}

export interface InfraState {
  target: string;
  env: string;
  bindings: Record<string, BindingState>;
}

export function statePath(rootDir: string, env: string, target: string): string {
  return join(rootDir, '.cruz', 'state', `${env}-${target}.json`);
}

export function readState(
  rootDir: string,
  env: string,
  target: string
): InfraState | null {
  const path = statePath(rootDir, env, target);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as InfraState;
  } catch {
    return null;
  }
}

export function writeState(rootDir: string, state: InfraState): void {
  const path = statePath(rootDir, state.env, state.target);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n', 'utf8');
}
