import { inject, injectable, unmanaged } from 'inversify';
import { ConfigService } from '../../config/config.service';
import { promises as fs } from 'fs';
import { stat } from 'fs/promises';
import { join, dirname } from 'path';
import { PutOptions, StorageDriver } from '../storage.interface';

/**
 * Local filesystem storage driver implementation
 * Uses local filesystem for storage (useful for development)
 */
export type LocalStorageDriverConfig = {
  storagePath: string;
  storageUrlBase?: string;
};

@injectable()
export class LocalStorageDriver implements StorageDriver {
  private storagePath: string;
  private storageUrlBase?: string;

  constructor(
    @inject(ConfigService) private configService: ConfigService,
    @unmanaged() config?: LocalStorageDriverConfig
  ) {
    if (config) {
      // Use provided config
      this.storagePath = config.storagePath;
      this.storageUrlBase = config.storageUrlBase;
    } else {
      // Fall back to environment variables
      this.storagePath =
        this.configService.get<string>('STORAGE_PATH') ||
        join(process.cwd(), 'storage');
      this.storageUrlBase = this.configService.get<string>('STORAGE_URL_BASE');
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDirectory(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    const dir = dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Get full filesystem path for a key
   */
  private getFullPath(key: string): string {
    return join(this.storagePath, key);
  }

  /**
   * Put a file into local storage
   */
  async put(
    key: string,
    content: Buffer | string,
    options?: PutOptions
  ): Promise<string> {
    await this.ensureDirectory(key);
    const fullPath = this.getFullPath(key);
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    // Convert Buffer to Uint8Array for TypeScript compatibility
    const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    await fs.writeFile(fullPath, data);
    return key;
  }

  /**
   * Get a file from local storage
   */
  async get(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return fs.readFile(fullPath);
  }

  /**
   * Delete a file from local storage
   */
  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, that's okay
    }
  }

  /**
   * Check if a file exists in local storage
   */
  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for a file
   * For local storage, returns a file:// URL or HTTP URL if serving via web server
   */
  async url(key: string): Promise<string> {
    // If STORAGE_URL_BASE is set, use it (e.g., http://localhost:3000/storage)
    if (this.storageUrlBase) {
      return `${this.storageUrlBase}/${key}`;
    }
    // Otherwise return file:// URL
    const fullPath = this.getFullPath(key);
    return `file://${fullPath}`;
  }

  /**
   * Get presigned URL for temporary access
   * For local storage, this is the same as url() since there's no expiration
   */
  async signedUrl(key: string, expiresIn?: number): Promise<string> {
    // Local storage doesn't support expiration, so just return the URL
    return this.url(key);
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
  } | null> {
    const fullPath = this.getFullPath(key);
    try {
      const stats = await stat(fullPath);
      // Try to determine content type from extension
      const contentType = this.getContentType(key);
      return {
        size: stats.size,
        contentType,
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get presigned upload URL
   * For local storage, returns a regular URL (no presigning needed)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    maxSize: number,
    expiresIn = 900
  ): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    const url = await this.url(key);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return { url, expiresAt };
  }
}

