export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge `patch` into `base` (rung-4 raw object patch). Arrays are replaced. */
export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Apply a rung-4 raw object patch onto a generated block, when raw is an object. */
export function applyRaw(
  block: Record<string, unknown>,
  raw: unknown
): Record<string, unknown> {
  return isPlainObject(raw) ? deepMerge(block, raw) : block;
}
