import { ConfigService } from '../config/config.service';
import { CloudflareContext } from '../cloudflare/context';
import { inject, injectable } from 'inversify';
import { LocalStorageDriver } from './drivers/local.driver.server';
import { R2StorageDriver } from './drivers/r2.driver';
import { StorageDriver } from './storage.interface';

/**
 * Storage service for managing storage drivers
 * Provides abstraction over different storage backends (R2, local filesystem)
 *
 * In local development mode (without wrangler), automatically falls back
 * to local filesystem storage when R2 is not available.
 */
@injectable()
export class StorageService {
  private defaultDriver: StorageDriver;

  constructor(
    @inject(R2StorageDriver) r2Driver: R2StorageDriver,
    @inject(LocalStorageDriver) localDriver: LocalStorageDriver,
    @inject(ConfigService) private configService: ConfigService
  ) {
    // Get default driver from environment
    const driverName = this.configService.get<string>('STORAGE_DRIVER') || 'r2';

    if (driverName === 'r2') {
      // Check if R2 is actually available (may not be in local dev without wrangler)
      const r2Bucket = CloudflareContext.r2;
      if (!r2Bucket) {
        console.log('[Storage] R2 not available, falling back to local storage');
        this.defaultDriver = localDriver;
      } else {
        this.defaultDriver = r2Driver;
      }
    } else if (driverName === 'local') {
      this.defaultDriver = localDriver;
    } else {
      throw new Error(
        `Invalid storage driver "${driverName}". Must be 'r2' or 'local'`
      );
    }
  }

  /**
   * Get the default storage driver
   * @returns Storage driver instance
   */
  disk(): StorageDriver {
    return this.defaultDriver;
  }
}
