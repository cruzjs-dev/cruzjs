import { getEnv, type Env } from './schema';
import { injectable } from 'inversify';

/**
 * Injectable configuration service
 * Provides access to validated environment variables matching NestJS ConfigService interface
 */
@injectable()
export class ConfigService {
  private _env: Env | null = null;

  /**
   * Get a configuration value by key path
   * Matches NestJS ConfigService.get() interface
   *
   * @param propertyPath - Configuration key path (e.g., 'S3_REGION', 'STORAGE_DRIVER')
   * @param defaultValue - Default value if key is not found
   * @returns Configuration value or default value
   *
   * @example
   * ```typescript
   * const region = configService.get<string>('S3_REGION');
   * const driver = configService.get<string>('STORAGE_DRIVER', 's3');
   * ```
   */
  get<T = unknown>(propertyPath: string, defaultValue?: T): T | undefined {
    const env = this.getEnv();
    const envRecord = env as Record<string, unknown>;
    const value = envRecord[propertyPath];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Get a configuration value by key path, throwing if not found
   * Matches NestJS ConfigService.getOrThrow() interface
   *
   * @param propertyPath - Configuration key path
   * @returns Configuration value
   * @throws Error if key is not found
   *
   * @example
   * ```typescript
   * const region = configService.getOrThrow<string>('S3_REGION');
   * ```
   */
  getOrThrow<T = unknown>(propertyPath: string): T {
    const value = this.get<T>(propertyPath);
    if (value === undefined) {
      throw new Error(
        `Configuration key "${propertyPath}" is required but not set`
      );
    }
    return value;
  }

  /**
   * Get validated environment variables object
   * @returns Validated environment variables
   */
  getEnv(): Env {
    if (!this._env) {
      this._env = getEnv();
    }
    return this._env;
  }

  /**
   * Get raw environment variable value
   * Use this for dynamic configs that aren't in the validated schema
   * (e.g., STORAGE_DRIVER_S3_AWS_ENDPOINT)
   *
   * @param key - Environment variable key
   * @returns Environment variable value or undefined
   */
  getRaw(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Get all raw environment variables matching a prefix
   * Useful for dynamic configurations like STORAGE_DRIVER_*
   *
   * @param prefix - Prefix to match (e.g., 'STORAGE_DRIVER_')
   * @returns Map of env var keys (without prefix) to values
   */
  getRawByPrefix(prefix: string): Map<string, string> {
    const result = new Map<string, string>();

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix) && value) {
        const keyWithoutPrefix = key.substring(prefix.length);
        result.set(keyWithoutPrefix, value);
      }
    }

    return result;
  }

  /**
   * Get all raw environment variables
   * @returns Map of all env vars
   */
  getAllRaw(): Map<string, string> {
    const result = new Map<string, string>();

    for (const [key, value] of Object.entries(process.env)) {
      if (value) {
        result.set(key, value);
      }
    }

    return result;
  }
}

