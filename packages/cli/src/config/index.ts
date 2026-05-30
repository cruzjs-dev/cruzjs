import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { Config, CloudflareEnvironment, DEFAULT_CONFIG } from './types';

const CONFIG_VERSION = '4.0.0';

export function getConfigPath(rootDir: string): string {
  return resolve(rootDir, '.deploy-cloudflare.json');
}

/**
 * Migrate a v3 environment to v4 format.
 * v3 had nested cloudflare config and separate binding types.
 * v4 flattens accountId to the environment level.
 */
function migrateV3Environment(env: Record<string, any>): CloudflareEnvironment {
  const accountId =
    env.accountId || env.cloudflare?.accountId || '';

  const migrated: CloudflareEnvironment = {
    name: env.name,
    accountId,
    createdAt: env.createdAt || new Date().toISOString(),
  };

  // Migrate D1
  if (env.d1) {
    migrated.d1 = {
      name: env.d1.name || env.d1.database_name || '',
      databaseId: env.d1.databaseId || env.d1.database_id || '',
    };
  }

  // Migrate KV
  if (env.kv) {
    migrated.kv = {
      name: env.kv.name || '',
      namespaceId: env.kv.namespaceId || env.kv.id || '',
    };
  }

  // Migrate R2
  if (env.r2) {
    migrated.r2 = {
      name: env.r2.name || env.r2.bucketName || '',
    };
  }

  // Migrate queues
  if (env.queue) {
    migrated.queues = [
      {
        name: env.queue.name || '',
        queueId: env.queue.queueId || '',
      },
    ];
  }

  if (env.customDomain) migrated.customDomain = env.customDomain;
  if (env.deployedAt) migrated.deployedAt = env.deployedAt;

  return migrated;
}

/**
 * Migrate config from v3 to v4 if needed.
 */
function migrateConfig(config: Record<string, any>): Config {
  const version = config.version || '3.0.0';

  if (version.startsWith('4.')) {
    return config as Config;
  }

  // v3 -> v4 migration
  const environments = (config.cloudflareEnvironments || []).map(
    migrateV3Environment
  );

  return {
    version: CONFIG_VERSION,
    pagesProject: config.pagesProject,
    cloudflareEnvironments: environments,
  };
}

export function loadConfig(rootDir: string): Config {
  const configPath = getConfigPath(rootDir);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const raw = JSON.parse(content);

    const config = migrateConfig(raw);

    return {
      ...DEFAULT_CONFIG,
      ...config,
      cloudflareEnvironments: config.cloudflareEnvironments || [],
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(rootDir: string, config: Config): void {
  const configPath = getConfigPath(rootDir);
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  config.version = CONFIG_VERSION;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function generateSecret(length = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

export * from './types';
