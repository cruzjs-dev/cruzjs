import { z } from 'zod';

/** Billing plan type (core-owned so config files don't depend on @cruzjs/saas) */
export type BillingPlan = {
  id: string;
  name: string;
  description: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  upgradeableFrom: string[];
  isUpgradeable: boolean;
};

/**
 * Environment variable validation schema
 * Validates all required environment variables on startup
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  PORT: z.string().regex(/^\d+$/).default('5000').transform(Number),
  APP_URL: z.string().url(),

  // Local Development Mode
  LOCAL_DEV: z
    .string()
    .optional()
    .describe('Set to "true" to enable local development mode (no wrangler)'),
  LOCAL_DB_PATH: z
    .string()
    .default('./data/local.db')
    .describe('Path to local SQLite database file (used in local dev mode)'),
  LOCAL_STORAGE_PATH: z
    .string()
    .default('./data/storage')
    .describe('Path to local file storage directory (used in local dev mode)'),

  // Storage
  STORAGE_DRIVER: z
    .enum(['r2', 'local'])
    .default('r2')
    .describe('Default storage driver (r2 or local)'),
  STORAGE_PATH: z
    .string()
    .optional()
    .describe('Local storage path (only used when STORAGE_DRIVER=local)'),
  STORAGE_URL_BASE: z
    .string()
    .url()
    .optional()
    .describe('Base URL for local storage files (only used when STORAGE_DRIVER=local)'),

  // Cloudflare R2 (when STORAGE_DRIVER=r2)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Email (MailChannels recommended for Cloudflare, or Resend/Mailgun)
  EMAIL_PROVIDER: z.enum(['mailchannels', 'resend', 'mailgun', 'console']).default('console'),
  EMAIL_API_KEY: z.string().optional(), // For Resend or Mailgun
  MAILGUN_DOMAIN: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  // DKIM for MailChannels (optional but recommended)
  DKIM_DOMAIN: z.string().optional(),
  DKIM_SELECTOR: z.string().optional(),
  DKIM_PRIVATE_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),

  // Security
  SESSION_SECRET: z
    .string()
    .min(32, 'Session secret must be at least 32 characters'),
  CSRF_SECRET: z.string().min(32, 'CSRF secret must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT refresh secret must be at least 32 characters'),

  // OAuth - Google (optional - not all deployments need Google login)
  GOOGLE_CLIENT_ID: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  GOOGLE_REDIRECT_URI: z.string().url().optional().or(z.literal('').transform(() => undefined)),

  // OAuth - Facebook (optional)
  FACEBOOK_CLIENT_ID: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  FACEBOOK_CLIENT_SECRET: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  FACEBOOK_REDIRECT_URI: z.string().url().optional().or(z.literal('').transform(() => undefined)),

  // Metrics (optional)
  METRICS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  METRICS_NAMESPACE: z.string().optional(),

  // Features
  ORGS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val !== 'false'),

  // Development
  ADMIN_EMAIL: z.string().email().optional(),
});

let env: Env;

/**
 * Type guard to check if a Zod issue is an invalid type error with received value
 */
function isInvalidTypeIssue(
  issue: z.ZodIssue
): issue is z.ZodIssue & { received: string } {
  return issue.code === 'invalid_type' && 'received' in issue;
}

/**
 * Check if running in Cloudflare Workers environment
 * In Workers, env vars come from bindings passed to fetch(), not process.env
 */
const isCloudflareWorkers = (): boolean => {
  // Check for Cloudflare-specific globals
  return typeof caches !== 'undefined' &&
         typeof (globalThis as any).WebSocketPair !== 'undefined';
};

/**
 * Validates and returns environment variables
 * Throws error with helpful messages if validation fails
 * For Cloudflare Workers, returns partial env and defers validation to runtime
 */
export const getEnv = (): Env => {
  if (env) {
    return env;
  }

  // In Cloudflare Workers or local dev mode, process.env might not be fully populated
  // Return what we have and let runtime handle missing vars
  const isLocalDev = process.env.LOCAL_DEV === 'true';
  if (isCloudflareWorkers() || isLocalDev) {
    // Return process.env cast to Env - validation happens at access time
    env = (process.env || {}) as unknown as Env;
    return env;
  }

  try {
    env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter(
          (err) =>
            isInvalidTypeIssue(err) && err.received === 'undefined'
        )
        .map((err) => err.path.join('.'));

      const invalidVars = error.issues
        .filter(
          (err) =>
            !isInvalidTypeIssue(err) || err.received !== 'undefined'
        )
        .map((err) => `${err.path.join('.')}: ${err.message}`);

      let errorMessage = '\n❌ Environment variable validation failed!\n\n';

      if (missingVars.length > 0) {
        errorMessage += 'Missing required variables:\n';
        missingVars.forEach((varName) => {
          errorMessage += `  - ${varName}\n`;
        });
        errorMessage += '\n';
      }

      if (invalidVars.length > 0) {
        errorMessage += 'Invalid variables:\n';
        invalidVars.forEach((varName) => {
          errorMessage += `  - ${varName}\n`;
        });
        errorMessage += '\n';
      }

      errorMessage +=
        '💡 Tip: Copy .env.example to .env and fill in your values\n';
      errorMessage +=
        '💡 Tip: Generate secrets with: openssl rand -base64 32\n';

      throw new Error(errorMessage);
    }

    throw error;
  }
};

/**
 * Get environment variable value (lazy getter)
 * Use this instead of process.env directly to ensure validation
 * Uses a Proxy for lazy evaluation to support Cloudflare Workers
 * where env vars are only available in the fetch handler
 */
export const envVar: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    const env = getEnv();
    return env[prop as keyof Env];
  },
});

/**
 * Complete configuration schema
 * Validates the entire config object structure
 */
export const configSchema = z.object({
  app: z.object({
    env: z.enum(['development', 'staging', 'production']),
    port: z.number().int().positive(),
    url: z.string().url(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  }),
  database: z.object({
    // Local dev settings (used when LOCAL_DEV=true)
    localPath: z.string().optional(),
    logQueries: z.boolean(),
  }),
  r2: z
    .object({
      accountId: z.string(),
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      bucket: z.string(),
      publicUrl: z.string().url().optional(),
    })
    .optional(),
  email: z.object({
    provider: z.enum(['mailchannels', 'resend', 'mailgun', 'console']),
    apiKey: z.string().optional(),
    mailgunDomain: z.string().optional(),
    from: z.string().email().optional(),
    fromName: z.string().optional(),
    dkimDomain: z.string().optional(),
    dkimSelector: z.string().optional(),
    dkimPrivateKey: z.string().optional(),
  }).optional(),
  stripe: z.object({
    secretKey: z.string().optional(),
    publishableKey: z.string().optional(),
    webhookSecret: z.string().optional(),
  }),
  security: z.object({
    sessionSecret: z.string().min(32),
    csrfSecret: z.string().min(32),
    jwtSecret: z.string().min(32),
    sessionMaxAge: z.number().int().positive(),
  }),
  oauth: z.object({
    google: z.object({
      clientId: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
      clientSecret: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
      redirectUri: z.string().url().optional().or(z.literal('').transform(() => undefined)),
    }).optional(),
    facebook: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        redirectUri: z.string().url(),
      })
      .optional(),
  }).optional(),
  monitoring: z.object({
    enabled: z.boolean(),
    namespace: z.string().optional(),
  }).optional(),
  admin: z.object({
    email: z.string().email(),
  }),
  // Application-specific configs
  auth: z.object({
    emailVerificationTokenExpiryHours: z.number().int().positive(),
    passwordResetTokenExpiryHours: z.number().int().positive(),
    bcryptRounds: z.number().int().min(10).max(15),
  }),
  session: z.object({
    ttlSeconds: z.number().int().positive(),
    refreshThresholdSeconds: z.number().int().positive(),
  }),
  billing: z.object({
    upgradeRules: z.record(z.string(), z.array(z.string())),
    defaultPlans: z.array(z.any()),
  }),
  upload: z.object({
    fileValidationRules: z.object({
      avatar: z.object({
        maxSize: z.number().int().positive(),
        allowedTypes: z.array(z.string()).readonly(),
        allowedExtensions: z.array(z.string()).readonly(),
      }),
      document: z.object({
        maxSize: z.number().int().positive(),
        allowedTypes: z.array(z.string()).readonly(),
        allowedExtensions: z.array(z.string()).readonly(),
      }),
      image: z.object({
        maxSize: z.number().int().positive(),
        allowedTypes: z.array(z.string()).readonly(),
        allowedExtensions: z.array(z.string()).readonly(),
      }),
      video: z.object({
        maxSize: z.number().int().positive(),
        allowedTypes: z.array(z.string()).readonly(),
        allowedExtensions: z.array(z.string()).readonly(),
      }),
      general: z.object({
        maxSize: z.number().int().positive(),
        allowedTypes: z.array(z.string()).readonly(),
        allowedExtensions: z.array(z.string()).readonly(),
      }),
    }),
  }),
  job: z.object({
    defaultMaxAttempts: z.number().int().positive(),
    fetchBatchSize: z.number().int().positive(),
    retryBaseDelayMs: z.number().int().positive(),
    retryMultiplier: z.number().positive(),
    failedJobsLimit: z.number().int().positive(),
  }),
  usage: z.object({
    planLimits: z.record(
      z.string(),
      z.object({
        members: z.union([z.number().int().positive(), z.literal(Infinity)]),
        storage: z.number().int().positive(),
      })
    ),
  }),
  rateLimit: z.object({
    auth: z.object({
      windowMs: z.number().int().positive(),
      maxRequests: z.number().int().positive(),
    }),
    api: z.object({
      windowMs: z.number().int().positive(),
      maxRequests: z.number().int().positive(),
    }),
    upload: z.object({
      windowMs: z.number().int().positive(),
      maxRequests: z.number().int().positive(),
    }),
    general: z.object({
      windowMs: z.number().int().positive(),
      maxRequests: z.number().int().positive(),
    }),
  }),
  ui: z.object({
    terminology: z.object({
      organization: z.object({
        singular: z.string().min(1),
        plural: z.string().min(1),
      }),
    }),
  }),
  features: z.object({
    orgs: z.boolean(),
  }),
});

/**
 * TypeScript type for environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * TypeScript type for the complete configuration
 */
export type Config = z.infer<typeof configSchema>;
