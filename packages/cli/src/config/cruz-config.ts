import { existsSync } from 'fs';
import { resolve } from 'path';
import { resolveAppDir } from '../utils/shell';
import type { CruzConfig, CruzBindings } from '../define-config';

const DEFAULT_BINDINGS: Required<CruzBindings> = {
  d1: true,
  kv: true,
  r2: false,
  ai: false,
  aiGateway: false,
  vectorize: false,
  queues: false,
  rateLimiting: false,
};

const APP_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Load and validate cruz.config.ts from the project.
 *
 * Looks for cruz.config.ts in the detected app dir (apps/<name>/) first, then rootDir.
 * Applies defaults for bindings and migrationsDir.
 */
export async function loadCruzConfig(rootDir: string): Promise<CruzConfig> {
  const candidates = [
    resolve(resolveAppDir(rootDir), 'cruz.config.ts'),
    resolve(rootDir, 'cruz.config.ts'),
  ];

  let configPath: string | undefined;
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      configPath = candidate;
      break;
    }
  }

  if (!configPath) {
    throw new Error(
      'Could not find cruz.config.ts. Looked in:\n' +
        candidates.map((c) => `  - ${c}`).join('\n') +
        '\n\nCreate one with: import { defineConfig } from "@cruzjs/cli/config"'
    );
  }

  const module = await import(configPath);
  const config: CruzConfig = module.default ?? module;

  // Validate name
  if (!config.name) {
    throw new Error('cruz.config.ts must specify a "name" property.');
  }

  if (config.name.length < 2) {
    throw new Error(
      `App name "${config.name}" is too short. Must be at least 2 characters.`
    );
  }

  if (!APP_NAME_REGEX.test(config.name)) {
    throw new Error(
      `App name "${config.name}" is invalid. Use only lowercase letters, numbers, and hyphens (e.g. "my-app").`
    );
  }

  // Apply binding defaults
  config.bindings = {
    ...DEFAULT_BINDINGS,
    ...config.bindings,
  };

  // Apply migrations dir default
  if (!config.migrationsDir) {
    config.migrationsDir = './src/database/migrations';
  }

  return config;
}

/**
 * Generate a deterministic resource name for a Cloudflare resource.
 *
 * @example
 * getResourceName('cruzjs', 'production', 'db') // => 'cruzjs-production-db'
 * getResourceName('cruzjs', 'staging', 'cache') // => 'cruzjs-staging-cache'
 */
export function getResourceName(
  appName: string,
  envName: string,
  type: string
): string {
  return `${appName}-${envName}-${type}`;
}
