import { getEnv, envVar, type Config } from './schema';

// Lazy imports to avoid eager evaluation in Cloudflare Workers
let _developmentConfig: Config | null = null;
let _productionConfig: Config | null = null;
let _stagingConfig: Config | null = null;

const getDevelopmentConfig = async (): Promise<Config> => {
  if (!_developmentConfig) {
    const { developmentConfig } = await import('./development');
    _developmentConfig = developmentConfig;
  }
  return _developmentConfig;
};

const getProductionConfig = async (): Promise<Config> => {
  if (!_productionConfig) {
    const { productionConfig } = await import('./production');
    _productionConfig = productionConfig;
  }
  return _productionConfig;
};

const getStagingConfig = async (): Promise<Config> => {
  if (!_stagingConfig) {
    const { stagingConfig } = await import('./staging');
    _stagingConfig = stagingConfig;
  }
  return _stagingConfig;
};

/**
 * Unified configuration export
 * Returns the appropriate config based on NODE_ENV
 */
export const getConfig = async (): Promise<Config> => {
  const env = getEnv();

  switch (env.NODE_ENV) {
    case 'production':
      return getProductionConfig();
    case 'staging':
      return getStagingConfig();
    case 'development':
    default:
      return getDevelopmentConfig();
  }
};

// For backwards compatibility, provide a sync getter that throws if not initialized
let _cachedConfig: Config | null = null;

export const config: Config = new Proxy({} as Config, {
  get(_target, prop: string) {
    if (_cachedConfig) {
      return _cachedConfig[prop as keyof Config];
    }
    // Return undefined during bundling - will be populated at runtime
    return undefined;
  },
});

// Initialize config asynchronously
export const initConfig = async (): Promise<Config> => {
  _cachedConfig = await getConfig();
  return _cachedConfig;
};

// Export type for convenience
export type { Config };

// Re-export env validation and schema
export { envVar, getEnv, configSchema } from './schema';
