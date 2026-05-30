/**
 * Eject — the top rung of the escape ladder.
 *
 * Flips a binding (or a whole target) to `managed: false` in state and writes
 * the generated native IaC into the repo (not .cruz/build, which is gitignored
 * and regenerated). After ejecting, the resolver/codegen skips the binding —
 * the user owns that IaC from then on. One-way door.
 *
 * State mutation is pure (`markEjected`); file writes live in `ejectToRepo`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GeneratedArtifact } from './adapter';
import type { ResolvedBinding } from './resolver';
import { writeState, type InfraState } from './state';

/** Pure: mark the given bindings (or all, if none specified) as unmanaged. */
export function markEjected(
  state: InfraState,
  bindings?: string[]
): InfraState {
  const names = bindings?.length ? bindings : Object.keys(state.bindings);
  const next = { ...state, bindings: { ...state.bindings } };
  for (const name of names) {
    const existing = next.bindings[name];
    next.bindings[name] = {
      managed: false,
      service: existing?.service,
      resource: existing?.resource,
    };
  }
  return next;
}

/** True when a binding has been ejected (user-owned, skip codegen). */
export function isEjected(state: InfraState | null, name: string): boolean {
  return state?.bindings?.[name]?.managed === false;
}

/** Drop ejected bindings from a resolved set before codegen/provisioning. */
export function filterEjected(
  resolved: ResolvedBinding[],
  state: InfraState | null
): ResolvedBinding[] {
  if (!state) return resolved;
  return resolved.filter((b) => !isEjected(state, b.name));
}

/** Where ejected IaC lands in the repo: infra/<target>/. */
export function ejectDir(rootDir: string, target: string): string {
  return join(rootDir, 'infra', target);
}

export function ejectToRepo(
  rootDir: string,
  state: InfraState,
  artifact: GeneratedArtifact,
  bindings?: string[]
): { state: InfraState; written: string[] } {
  const next = markEjected(state, bindings);
  writeState(rootDir, next);

  const written: string[] = [];
  const dir = ejectDir(rootDir, state.target);
  for (const file of artifact.files) {
    const path = join(dir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content, 'utf8');
    written.push(path);
  }
  return { state: next, written };
}
