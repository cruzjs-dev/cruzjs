/**
 * Target-agnostic logical infrastructure bindings.
 *
 * A `BindingSpec` describes a capability the app needs (sql, kv, blob, ...)
 * without naming a cloud service. Per-target adapters resolve each spec into a
 * concrete native service + IaC artifact. The escape-hatch ladder (rungs 0-5)
 * is expressed through optional fields, climbed only as needed:
 *
 *   0 logical        type + engine
 *   1 portable tuning size / scale / region
 *   2 service swap    targets.<t>.service
 *   3 native knobs    targets.<t>.options
 *   4 raw patch       targets.<t>.raw
 *   5 BYO resource    external.<t>  (skip provisioning)
 *
 * Axis 2 (sourcing) is orthogonal to target via `provider`:
 *   'native'  -> the cloud's own service (default)
 *   '<saas>'  -> a 3rd-party managed provider (e.g. 'neon', 'upstash')
 *   'self'    -> a container you run
 */

import { z } from 'zod';

export const BINDING_TYPES = [
  'sql',
  'kv',
  'blob',
  'queue',
  'vector',
  'search',
  'cron',
  'realtime',
  'llm',
  'email',
] as const;

export type BindingType = (typeof BINDING_TYPES)[number];

/** Rungs 2-4: per-target overrides. */
export const targetOverrideSchema = z
  .object({
    /** Rung 2 — swap the native service within a cloud (must exist in the adapter manifest). */
    service: z.string().optional(),
    /** Rung 3 — native, service-specific knobs merged onto the resolved resource. */
    options: z.record(z.string(), z.unknown()).optional(),
    /**
     * Rung 4 — raw escape hatch merged into the generated IaC.
     * Declarative targets (Cloudflare/DO/Bicep) accept an object (deep-merged).
     * Imperative targets (CDK/Pulumi) accept a mutator function.
     */
    raw: z.unknown().optional(),
  })
  .strict();

export type TargetOverride = z.infer<typeof targetOverrideSchema>;

/** Rung 5: point at an already-existing resource; the adapter binds but does not provision. */
export const externalRefSchema = z
  .object({
    /** Indirect reference resolved at deploy/runtime, e.g. 'env:DATABASE_URL'. */
    ref: z.string().optional(),
    /** Provider-native resource id (KV namespace id, D1 database id, ...). */
    id: z.string().optional(),
    /** AWS-style ARN, when applicable. */
    arn: z.string().optional(),
  })
  .passthrough();

export type ExternalRef = z.infer<typeof externalRefSchema>;

const scaleSchema = z
  .object({
    /** min instances/capacity; 0 expresses scale-to-zero intent. */
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();

/**
 * `'*'` is a wildcard key matching any target. An explicit target key
 * (e.g. 'cloudflare') wins over `'*'`.
 */
const perTargetString = z.record(z.string(), z.string());

export const bindingSpecSchema = z.object({
  type: z.enum(BINDING_TYPES),

  /** sql: 'sqlite'|'postgres'|'mysql'. queue mode is separate (see `mode`). */
  engine: z.string().optional(),

  /** Sourcing axis: 'native' (default), 'self', or a saas provider name. */
  provider: z.string().default('native'),

  // — rung 1: portable tuning —
  size: z.enum(['small', 'medium', 'large']).optional(),
  scale: scaleSchema.optional(),
  region: z.string().optional(),

  /** queue semantics: point-to-point work queue vs pub/sub fan-out. */
  mode: z.enum(['work', 'fanout']).optional(),
  /** vector index dimensionality. */
  dims: z.number().optional(),
  /** cron: one or more cron expressions. */
  schedule: z.union([z.string(), z.array(z.string())]).optional(),

  // — negotiation —
  /** Fail the build if this binding cannot be satisfied on the target. */
  required: z.boolean().default(false),
  /** Skip (with a warning) if this binding cannot be satisfied. */
  optional: z.boolean().default(false),
  /** target|'*' -> service/provider to use when there is no native fit. */
  fallback: perTargetString.optional(),

  // — rung 5 —
  /** target|'*' -> existing resource reference. Presence => skip provisioning. */
  external: z.record(z.string(), externalRefSchema).optional(),

  // — rungs 2-4 —
  /** target -> overrides (service swap / native options / raw patch). */
  targets: z.record(z.string(), targetOverrideSchema).optional(),
});

export type BindingSpec = z.input<typeof bindingSpecSchema>;
export type ResolvedSpec = z.infer<typeof bindingSpecSchema>;

/** The infra block of cruz.config.ts (slice: bindings only). */
export const infraConfigSchema = z.object({
  /** App name — prefix for all provisioned resources. */
  name: z.string(),
  /** Logical name (e.g. 'db') -> spec. */
  bindings: z.record(z.string(), bindingSpecSchema).default({}),
});

export type InfraConfig = z.input<typeof infraConfigSchema>;

/** Resolve a per-target value from a `{ target|'*': V }` map. */
export function pickForTarget<V>(
  map: Record<string, V> | undefined,
  target: string
): V | undefined {
  if (!map) return undefined;
  return target in map ? map[target] : map['*'];
}
