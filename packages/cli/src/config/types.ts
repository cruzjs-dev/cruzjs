/**
 * Configuration Types for Cruz Deploy CLI (v4)
 *
 * Cloudflare-only configuration with simplified environment model.
 */

export type CloudflareEnvironment = {
  name: string;
  accountId: string;
  d1?: { name: string; databaseId: string };
  kv?: { name: string; namespaceId: string };
  r2?: { name: string };
  queues?: { name: string; queueId: string }[];
  vectorize?: { name: string; indexName: string }[];
  customDomain?: string;
  deployedAt?: string;
  createdAt: string;
};

export type Config = {
  version: string;
  pagesProject?: string;
  cloudflareEnvironments: CloudflareEnvironment[];
};

export const DEFAULT_CONFIG: Config = {
  version: '4.0.0',
  cloudflareEnvironments: [],
};

export type CommandContext = {
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
};
