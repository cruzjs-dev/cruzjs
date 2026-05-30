import type { LogLevel, NamespaceLevelConfig } from './log.types';

const VALID_LEVELS = new Set<string>(['debug', 'info', 'warning', 'error', 'critical']);

export function parseNamespaceLevels(envValue: string | undefined): NamespaceLevelConfig[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(',')
    .map(pair => pair.trim())
    .filter(Boolean)
    .map(pair => {
      const colonIdx = pair.indexOf(':');
      if (colonIdx === -1) return null;
      const namespace = pair.slice(0, colonIdx).trim();
      const level = pair.slice(colonIdx + 1).trim();
      if (!namespace || !VALID_LEVELS.has(level)) return null;
      return { namespace, level: level as LogLevel };
    })
    .filter((x): x is NamespaceLevelConfig => x !== null);
}

export function resolveNamespaceLevel(
  source: string | undefined,
  namespaceLevels: NamespaceLevelConfig[],
  globalLevel: LogLevel,
): LogLevel {
  if (!source || namespaceLevels.length === 0) return globalLevel;

  // Exact match first
  const exact = namespaceLevels.find(nl => nl.namespace === source);
  if (exact) return exact.level;

  // Hierarchical match (e.g., 'auth.oauth' matches 'auth')
  const parts = source.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const prefix = parts.slice(0, i).join('.');
    const match = namespaceLevels.find(nl => nl.namespace === prefix);
    if (match) return match.level;
  }

  return globalLevel;
}
