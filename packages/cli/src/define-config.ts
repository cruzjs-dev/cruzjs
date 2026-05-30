/**
 * CruzJS deployment configuration.
 * Used by the deploy CLI to generate wrangler.toml and manage environments.
 */

export type CruzBindings = {
  /** D1 SQL database (default: true) */
  d1?: boolean;
  /** KV key-value store (default: true) */
  kv?: boolean;
  /** R2 object storage (default: false) */
  r2?: boolean;
  /** Workers AI (default: false) */
  ai?: boolean;
  /** AI Gateway (default: false) */
  aiGateway?: boolean;
  /** Vectorize vector database (default: false) */
  vectorize?: boolean;
  /** Queues (default: false) — set to true to auto-register the built-in JOBS_QUEUE */
  queues?: boolean;
  /** Rate limiting (default: false) */
  rateLimiting?: boolean;
};

/**
 * Queue configuration for the app.
 * The built-in JOBS_QUEUE is always included when queues are enabled.
 */
export type CruzQueueConfig = {
  /** Queue resource name on Cloudflare (e.g., 'my-notifications') */
  name: string;
  /**
   * Binding name used in code (e.g., 'NOTIFICATIONS_QUEUE').
   * Defaults to NAME_QUEUE (uppercased, hyphens → underscores).
   */
  binding?: string;
  /** Max messages per batch (default: 10) */
  maxBatchSize?: number;
  /** Max seconds to wait for a full batch (default: 30) */
  maxBatchTimeout?: number;
};

/**
 * Scheduled (cron) trigger configuration.
 */
export type CruzScheduledConfig = {
  /** Cron expression (e.g., '0 * * * *' for hourly) */
  cron: string;
  /** Human-readable description for documentation */
  description?: string;
};

/**
 * Feature flags for enabling/disabling CruzJS modules.
 */
export type CruzFeatures = {
  /**
   * Enable multi-tenancy (organizations, members, invitations).
   * When disabled, the org creation step is skipped during registration
   * and users go directly to /dashboard after signup.
   * @default true
   */
  orgs?: boolean;
};

export type CruzEmailConfig = {
  /** Email provider — 'mailchannels' is free for Cloudflare Workers */
  provider: 'mailchannels' | 'resend' | 'none';
  /** Sender email address (set as secret for production) */
  from?: string;
  /** Sender display name */
  fromName?: string;
};

export type CruzEnvironmentConfig = {
  /** Environment-specific variables (merged with base vars) */
  vars?: Record<string, string>;
  /** Custom domain for this environment */
  domain?: string;
};

export type CruzConfig = {
  /** App name — used as prefix for all Cloudflare resources (e.g. 'myapp' -> 'myapp-production-db') */
  name: string;

  /** Cloudflare compatibility date */
  compatibilityDate?: string;

  /** Cloudflare compatibility flags */
  compatibilityFlags?: string[];

  /** Which Cloudflare bindings the app uses */
  bindings?: CruzBindings;

  /** Email configuration */
  email?: CruzEmailConfig;

  /**
   * Additional queues beyond the built-in JOBS_QUEUE.
   * The JOBS_QUEUE is automatically configured when `bindings.queues` is true.
   *
   * @example
   * ```ts
   * queues: [
   *   { name: 'notifications', binding: 'NOTIFICATIONS_QUEUE' },
   *   { name: 'data-export' },
   * ]
   * ```
   */
  queues?: CruzQueueConfig[];

  /**
   * Scheduled (cron) triggers.
   * These generate `[triggers]` entries in wrangler.toml.
   *
   * @example
   * ```ts
   * scheduled: [
   *   { cron: '0 * * * *', description: 'Hourly cleanup' },
   *   { cron: '0 0 * * *', description: 'Daily digest' },
   * ]
   * ```
   */
  scheduled?: CruzScheduledConfig[];

  /** Feature flags for enabling/disabling modules */
  features?: CruzFeatures;

  /** Variables shared across all environments */
  vars?: Record<string, string>;

  /** D1 migrations directory relative to app root (default: './src/database/migrations') */
  migrationsDir?: string;

  /** Environment-specific configuration */
  environments?: Record<string, CruzEnvironmentConfig>;
};

/**
 * Define CruzJS deployment configuration with full TypeScript support.
 *
 * @example
 * ```ts
 * // cruz.config.ts
 * import { defineConfig } from '@cruzjs/cli/config';
 *
 * export default defineConfig({
 *   name: 'myapp',
 *   bindings: { d1: true, kv: true, ai: true },
 *   email: { provider: 'mailchannels' },
 *   environments: {
 *     production: { vars: { NODE_ENV: 'production' } },
 *   },
 * });
 * ```
 */
export function defineConfig(config: CruzConfig): CruzConfig {
  return config;
}
