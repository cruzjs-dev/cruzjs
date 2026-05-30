/**
 * Provisioning layer.
 *
 * Pure planning + state writeback, decoupled from any cloud CLI via an injected
 * `ProvisionExecutor`. The planner determines which managed bindings still need
 * a resource created (no id in state); the executor creates them and returns
 * ids; the writeback merges ids back into state for reproducible deploys.
 *
 * `provision()` is the only impure entry point (reads/writes state, awaits the
 * executor). Planning and writeback are pure and unit-tested.
 */

import type { ResolvedBinding } from './resolver';
import {
  readState,
  writeState,
  type BindingState,
  type InfraState,
} from './state';

export interface ProvisionIntent {
  binding: string;
  type: string;
  service: string;
  /** Desired resource name. */
  name: string;
  options: Record<string, unknown>;
}

export interface ProvisionResult {
  binding: string;
  resource: { name: string; id: string };
}

export interface ProvisionExecutor {
  target: string;
  /** Create the resource; return its provider-assigned id (and final name). */
  create(intent: ProvisionIntent): Promise<{ name: string; id: string }>;
}

/** Bindings that need a resource created: managed, not skipped, no id yet. */
export function planProvision(
  resolved: ResolvedBinding[],
  state: InfraState | null
): ProvisionIntent[] {
  const intents: ProvisionIntent[] = [];
  for (const b of resolved) {
    if (b.skipProvision || !b.service) continue;
    const known = state?.bindings?.[b.name]?.resource?.id;
    if (known) continue; // already provisioned
    intents.push({
      binding: b.name,
      type: b.type,
      service: b.service,
      name: b.resource?.name ?? b.name,
      options: b.options,
    });
  }
  return intents;
}

/** Merge provision results into state (pure). Preserves existing managed flags. */
export function applyProvisionResults(
  prev: InfraState,
  resolved: ResolvedBinding[],
  results: ProvisionResult[]
): InfraState {
  const bindings: Record<string, BindingState> = { ...prev.bindings };

  // Ensure every managed binding has a state entry.
  for (const b of resolved) {
    if (b.skipProvision) continue;
    const existing = bindings[b.name];
    bindings[b.name] = {
      managed: existing?.managed ?? true,
      service: b.service ?? existing?.service,
      resource: existing?.resource ?? b.resource,
    };
  }

  for (const r of results) {
    const existing = bindings[r.binding];
    bindings[r.binding] = {
      managed: existing?.managed ?? true,
      service: existing?.service,
      resource: r.resource,
    };
  }

  return { ...prev, bindings };
}

export async function provision(
  rootDir: string,
  env: string,
  resolved: ResolvedBinding[],
  executor: ProvisionExecutor
): Promise<{ state: InfraState; created: ProvisionResult[]; intents: ProvisionIntent[] }> {
  const prev =
    readState(rootDir, env, executor.target) ??
    ({ target: executor.target, env, bindings: {} } satisfies InfraState);

  const intents = planProvision(resolved, prev);
  const created: ProvisionResult[] = [];
  for (const intent of intents) {
    const resource = await executor.create(intent);
    created.push({ binding: intent.binding, resource });
  }

  const state = applyProvisionResults(prev, resolved, created);
  writeState(rootDir, state);
  return { state, created, intents };
}
