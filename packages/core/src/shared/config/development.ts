import { configSchema, envVar, type Config, type BillingPlan } from './schema';

// Billing configuration
const UPGRADE_RULES: Record<string, string[]> = {
  free: ['pro', 'enterprise'],
  pro: ['enterprise'],
  enterprise: [],
};

const DEFAULT_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    currency: 'usd',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['Up to 5 team members', 'Basic features', 'Community support'],
    upgradeableFrom: [],
    isUpgradeable: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams',
    currency: 'usd',
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    features: [
      'Unlimited team members',
      'Advanced features',
      'Priority support',
      'Custom integrations',
    ],
    upgradeableFrom: ['free'],
    isUpgradeable: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    currency: 'usd',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom SLA',
      'On-premise deployment',
    ],
    upgradeableFrom: ['free', 'pro'],
    isUpgradeable: false,
  },
];

// Upload validation rules
const fileValidationRules = {
  avatar: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  document: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
  },
  image: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  video: {
    maxSize: 100 * 1024 * 1024,
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov'],
  },
  general: {
    maxSize: 50 * 1024 * 1024,
    allowedTypes: ['*'],
    allowedExtensions: ['*'],
  },
};

// Usage limits per plan
const planLimits = {
  free: {
    members: 5,
    storage: 100 * 1024 * 1024,
  },
  pro: {
    members: Infinity,
    storage: 10 * 1024 * 1024 * 1024,
  },
  enterprise: {
    members: Infinity,
    storage: 100 * 1024 * 1024 * 1024,
  },
};

// Convert readonly arrays to mutable arrays for Zod validation
const mutableFileValidationRules = {
  avatar: {
    ...fileValidationRules.avatar,
    allowedTypes: [...fileValidationRules.avatar.allowedTypes],
    allowedExtensions: [...fileValidationRules.avatar.allowedExtensions],
  },
  document: {
    ...fileValidationRules.document,
    allowedTypes: [...fileValidationRules.document.allowedTypes],
    allowedExtensions: [...fileValidationRules.document.allowedExtensions],
  },
  image: {
    ...fileValidationRules.image,
    allowedTypes: [...fileValidationRules.image.allowedTypes],
    allowedExtensions: [...fileValidationRules.image.allowedExtensions],
  },
  video: {
    ...fileValidationRules.video,
    allowedTypes: [...fileValidationRules.video.allowedTypes],
    allowedExtensions: [...fileValidationRules.video.allowedExtensions],
  },
  general: {
    ...fileValidationRules.general,
    allowedTypes: [...fileValidationRules.general.allowedTypes],
    allowedExtensions: [...fileValidationRules.general.allowedExtensions],
  },
};

/**
 * Development environment configuration
 * Optimized for local development with relaxed settings
 */
const developmentConfigRaw: Config = {
  app: {
    env: 'development',
    port: envVar.PORT,
    url: envVar.APP_URL,
    logLevel: 'debug',
  },
  database: {
    localPath: envVar.LOCAL_DB_PATH,
    logQueries: true,
  },
  r2: envVar.R2_ACCOUNT_ID &&
    envVar.R2_ACCESS_KEY_ID &&
    envVar.R2_SECRET_ACCESS_KEY &&
    envVar.R2_BUCKET
    ? {
        accountId: envVar.R2_ACCOUNT_ID,
        accessKeyId: envVar.R2_ACCESS_KEY_ID,
        secretAccessKey: envVar.R2_SECRET_ACCESS_KEY,
        bucket: envVar.R2_BUCKET,
        publicUrl: envVar.R2_PUBLIC_URL,
      }
    : undefined,
  email: {
    provider: envVar.EMAIL_PROVIDER,
    apiKey: envVar.EMAIL_API_KEY,
    mailgunDomain: envVar.MAILGUN_DOMAIN,
    from: envVar.EMAIL_FROM,
    fromName: envVar.EMAIL_FROM_NAME,
    dkimDomain: envVar.DKIM_DOMAIN,
    dkimSelector: envVar.DKIM_SELECTOR,
    dkimPrivateKey: envVar.DKIM_PRIVATE_KEY,
  },
  stripe: {
    secretKey: envVar.STRIPE_SECRET_KEY,
    publishableKey: envVar.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: envVar.STRIPE_WEBHOOK_SECRET,
  },
  security: {
    sessionSecret: envVar.SESSION_SECRET,
    csrfSecret: envVar.CSRF_SECRET,
    jwtSecret: envVar.JWT_SECRET,
    sessionMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  oauth: {
    google: envVar.GOOGLE_CLIENT_ID && envVar.GOOGLE_CLIENT_SECRET && envVar.GOOGLE_REDIRECT_URI
      ? {
          clientId: envVar.GOOGLE_CLIENT_ID,
          clientSecret: envVar.GOOGLE_CLIENT_SECRET,
          redirectUri: envVar.GOOGLE_REDIRECT_URI,
        }
      : undefined,
    facebook: envVar.FACEBOOK_CLIENT_ID
      ? {
          clientId: envVar.FACEBOOK_CLIENT_ID,
          clientSecret: envVar.FACEBOOK_CLIENT_SECRET!,
          redirectUri: envVar.FACEBOOK_REDIRECT_URI!,
        }
      : undefined,
  },
  monitoring: {
    enabled: envVar.METRICS_ENABLED,
    namespace: envVar.METRICS_NAMESPACE,
  },
  admin: {
    email: envVar.ADMIN_EMAIL ?? 'admin@example.com',
  },
  auth: {
    emailVerificationTokenExpiryHours: 24,
    passwordResetTokenExpiryHours: 1,
    bcryptRounds: 10,
  },
  session: {
    ttlSeconds: 30 * 24 * 60 * 60, // 30 days
    refreshThresholdSeconds: 7 * 24 * 60 * 60, // 7 days
  },
  billing: {
    upgradeRules: UPGRADE_RULES,
    defaultPlans: DEFAULT_PLANS,
  },
  upload: {
    fileValidationRules: mutableFileValidationRules,
  },
  job: {
    defaultMaxAttempts: 3,
    fetchBatchSize: 100,
    retryBaseDelayMs: 1000,
    retryMultiplier: 2,
    failedJobsLimit: 100,
  },
  usage: {
    planLimits,
  },
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
    upload: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
    },
    general: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 1000,
    },
  },
  ui: {
    terminology: {
      organization: {
        singular: 'Organization',
        plural: 'Organizations',
      },
    },
  },
  features: {
    orgs: envVar.ORGS_ENABLED ?? true,
  },
};

/**
 * Validated development configuration
 * Wrapped in try/catch for Cloudflare Workers compatibility
 */
let _developmentConfig: Config | null = null;

export const developmentConfig: Config = new Proxy({} as Config, {
  get(_target, prop: string) {
    if (!_developmentConfig) {
      try {
        _developmentConfig = configSchema.parse(developmentConfigRaw);
      } catch (e) {
        _developmentConfig = developmentConfigRaw as Config;
      }
    }
    return _developmentConfig[prop as keyof Config];
  },
});
