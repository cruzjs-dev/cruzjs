/**
 * Capability manifest — a per-target declaration of what a cloud natively
 * supports for each logical binding. The resolver reconciles a `BindingSpec`
 * against this manifest (native? fallback? unsupported?). The same data drives
 * the cross-cloud capability matrix.
 */

import type { BindingType } from './bindings';

export interface CapabilityEntry {
  /**
   * engine|'*' -> native service id. The default service for a given engine.
   * Absent => the target has no native service for this binding type.
   */
  native?: Record<string, string>;
  /** Service ids selectable via a rung-2 `targets.<t>.service` override. */
  services?: string[];
  /** Subset of `services` that can genuinely scale to zero. */
  scaleToZero?: string[];
  /** Service id used when there is no native fit but a fallback is acceptable. */
  fallback?: string;
}

export interface IacFormat {
  /** 'wrangler' | 'cdk' | 'knative' | 'bicep' | 'app-spec' | 'compose' */
  format: string;
  /** Output filename the adapter emits into .cruz/build/<env>-<target>/. */
  emit: string;
}

export interface CapabilityManifest {
  target: string;
  capabilities: Partial<Record<BindingType, CapabilityEntry>>;
  iac: IacFormat;
}

/** Look up the native service id for a binding type + engine. */
export function nativeService(
  entry: CapabilityEntry | undefined,
  engine: string | undefined
): string | undefined {
  if (!entry?.native) return undefined;
  if (engine && engine in entry.native) return entry.native[engine];
  return entry.native['*'];
}
