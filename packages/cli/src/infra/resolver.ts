/**
 * Target-agnostic binding resolver.
 *
 * Reconciles each logical `BindingSpec` against a target's `CapabilityManifest`,
 * applying the escape-hatch ladder and capability negotiation. Output is a list
 * of `ResolvedBinding`s (plus warnings/errors) that a per-target codegen step
 * turns into native IaC. The resolver itself is cloud-agnostic — it never names
 * a wrangler key or a CDK construct.
 */

import {
  infraConfigSchema,
  pickForTarget,
  type InfraConfig,
  type ResolvedSpec,
  type BindingType,
  type ExternalRef,
} from './bindings';
import {
  nativeService,
  type CapabilityManifest,
  type CapabilityEntry,
} from './manifest';
import type { InfraState } from './state';

/** How a resolved binding is sourced. */
export type Sourcing = 'native' | 'saas' | 'self' | 'external';

export interface ResolvedBinding {
  /** Logical name from config (e.g. 'db'). */
  name: string;
  type: BindingType;
  sourcing: Sourcing;
  /** Native service id, saas provider name, 'self', or null when skipped. */
  service: string | null;
  engine?: string;
  /** Merged native knobs (rung 3) plus recorded portable tuning (rung 1). */
  options: Record<string, unknown>;
  /** Raw IaC patch (rung 4) — object (declarative) or function (imperative). */
  raw?: unknown;
  /** Existing-resource reference when sourcing === 'external' (rung 5). */
  external?: ExternalRef;
  /** Provisioned resource name + id, carried from state when known. */
  resource?: { name?: string; id?: string };
  /** True when the adapter should NOT provision (external or skipped). */
  skipProvision: boolean;
  warnings: string[];
}

export interface ResolveResult {
  target: string;
  bindings: ResolvedBinding[];
  warnings: string[];
  errors: string[];
}

const KNOWN_SAAS = new Set([
  'neon',
  'turso',
  'planetscale',
  'supabase',
  'upstash',
  'resend',
  'openrouter',
  'openai',
  'anthropic',
]);

function classifyProvider(provider: string): Sourcing {
  if (provider === 'native') return 'native';
  if (provider === 'self') return 'self';
  return 'saas';
}

function resolveOne(
  name: string,
  spec: ResolvedSpec,
  manifest: CapabilityManifest,
  state: InfraState | null
): ResolvedBinding {
  const target = manifest.target;
  const warnings: string[] = [];
  const entry: CapabilityEntry | undefined = manifest.capabilities[spec.type];
  const override = spec.targets?.[target];

  const options: Record<string, unknown> = {};
  // rung 1 — record portable tuning (adapters consume what they can).
  if (spec.size) options.size = spec.size;
  if (spec.scale) options.scale = spec.scale;
  if (spec.region) options.region = spec.region;
  if (spec.mode) options.mode = spec.mode;
  if (spec.dims) options.dims = spec.dims;
  if (spec.schedule) options.schedule = spec.schedule;
  // rung 3 — native knobs win over portable tuning.
  Object.assign(options, override?.options ?? {});

  const stateRes = state?.bindings?.[name]?.resource;
  const base: ResolvedBinding = {
    name,
    type: spec.type,
    sourcing: 'native',
    service: null,
    engine: spec.engine,
    options,
    raw: override?.raw,
    resource: stateRes,
    skipProvision: false,
    warnings,
  };

  // rung 5 — BYO existing resource. Highest precedence: skip provisioning.
  const external = pickForTarget(spec.external, target);
  if (external) {
    return {
      ...base,
      sourcing: 'external',
      service: nativeService(entry, spec.engine) ?? null,
      external,
      skipProvision: true,
    };
  }

  const sourcing = classifyProvider(spec.provider);

  // saas — 3rd-party managed; not provisioned by the cloud adapter, wired via secret.
  if (sourcing === 'saas') {
    return { ...base, sourcing: 'saas', service: spec.provider, skipProvision: true };
  }

  // self — container the user runs. Only meaningful on container-capable targets.
  if (sourcing === 'self') {
    if (manifest.iac.format !== 'compose') {
      warnings.push(
        `binding "${name}": provider:'self' is not supported on target "${target}" ` +
          `(${manifest.iac.format}); use a saas provider or 'native'.`
      );
    }
    return { ...base, sourcing: 'self', service: 'self', skipProvision: false };
  }

  // native — pick the service.
  let service = override?.service ?? nativeService(entry, spec.engine);

  // rung 2 validation — a swapped service must be advertised by the manifest.
  if (override?.service && entry?.services && !entry.services.includes(override.service)) {
    warnings.push(
      `binding "${name}": service "${override.service}" is not a known ${target} ` +
        `service for ${spec.type} (known: ${entry.services.join(', ')}).`
    );
  }

  // No native fit on this target — negotiate.
  if (!service) {
    const fallback = pickForTarget(spec.fallback, target) ?? entry?.fallback;
    if (fallback) {
      warnings.push(
        `binding "${name}": no native ${spec.type} on "${target}"; using fallback "${fallback}".`
      );
      return { ...base, sourcing: 'native', service: fallback };
    }
    if (spec.required) {
      // Signalled to caller via errors; still return a skipped binding.
      return {
        ...base,
        service: null,
        skipProvision: true,
        warnings: [
          ...warnings,
          `binding "${name}": REQUIRED but no native ${spec.type} on "${target}" and no fallback.`,
        ],
      };
    }
    warnings.push(
      `binding "${name}": no native ${spec.type} on "${target}"; skipped (mark required:true to fail the build, or add a fallback).`
    );
    return { ...base, service: null, skipProvision: true };
  }

  // engine mismatch — service exists but cannot honor the requested engine
  // (e.g. postgres requested on Cloudflare, whose only native sql is sqlite/D1).
  if (spec.engine && entry?.native && !(spec.engine in entry.native) && !entry.native['*']) {
    warnings.push(
      `binding "${name}": engine "${spec.engine}" not available on "${target}"; ` +
        `native service "${service}" uses a different engine.`
    );
  } else if (
    spec.engine &&
    entry?.native &&
    !(spec.engine in entry.native) &&
    entry.native['*']
  ) {
    warnings.push(
      `binding "${name}": requested engine "${spec.engine}" but "${target}" native ` +
        `service "${service}" may not match; verify compatibility or use provider:'<saas>'.`
    );
  }

  // scale-to-zero intent that the chosen service cannot honor.
  if (
    spec.scale?.min === 0 &&
    entry?.scaleToZero &&
    !entry.scaleToZero.includes(service)
  ) {
    warnings.push(
      `binding "${name}": scale.min:0 requested but "${service}" on "${target}" does not scale to zero.`
    );
  }

  return { ...base, sourcing: 'native', service };
}

export function resolveBindings(
  rawConfig: InfraConfig,
  manifest: CapabilityManifest,
  state: InfraState | null = null
): ResolveResult {
  const config = infraConfigSchema.parse(rawConfig);
  const bindings: ResolvedBinding[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [name, spec] of Object.entries(config.bindings)) {
    const resolved = resolveOne(name, spec, manifest, state);
    bindings.push(resolved);
    for (const w of resolved.warnings) {
      if (w.includes('REQUIRED')) errors.push(w);
      else warnings.push(w);
    }
  }

  return { target: manifest.target, bindings, warnings, errors };
}
