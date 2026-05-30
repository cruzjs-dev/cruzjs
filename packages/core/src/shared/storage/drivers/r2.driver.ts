import { R2Service } from '../../cloudflare';
import { ConfigService } from '../../config/config.service';
import { inject, injectable } from 'inversify';
import { PutOptions, StorageDriver } from '../storage.interface';

/**
 * R2 storage driver implementation
 * Wraps R2Service to provide StorageDriver interface for Cloudflare R2
 */
@injectable()
export class R2StorageDriver implements StorageDriver {
  constructor(
    @inject(R2Service) private r2Service: R2Service,
    @inject(ConfigService) private configService: ConfigService
  ) {}

  /**
   * Put a file into R2
   */
  async put(
    key: string,
    content: Buffer | string,
    options?: PutOptions
  ): Promise<string> {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    // Convert Buffer to Uint8Array for R2 (works as ArrayBuffer-like)
    const uint8Array = new Uint8Array(buffer);

    await this.r2Service.put(key, uint8Array.buffer as ArrayBuffer, {
      httpMetadata: {
        contentType: options?.contentType,
      },
      customMetadata: options?.metadata,
    });

    return key;
  }

  /**
   * Get a file from R2
   */
  async get(key: string): Promise<Buffer> {
    const result = await this.r2Service.getAsBuffer(key);
    if (!result) {
      throw new Error(`Object ${key} not found in R2`);
    }
    return result;
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    return this.r2Service.delete(key);
  }

  /**
   * Check if a file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    return this.r2Service.exists(key);
  }

  /**
   * Get public URL for a file
   * Note: Requires public bucket or custom domain
   */
  async url(key: string): Promise<string> {
    return this.r2Service.getPublicUrl(key);
  }

  /**
   * Get signed URL for temporary access
   * Note: R2 doesn't support presigned URLs natively - use public URLs or Workers-based auth
   */
  async signedUrl(key: string, _expiresIn = 900): Promise<string> {
    // R2 doesn't have native presigned URL support like S3
    // For private files, use a Workers-based authentication layer
    // For now, return the public URL (if bucket is public)
    console.warn(
      'R2 does not support presigned URLs natively. Returning public URL. Consider implementing Workers-based auth.'
    );
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
    const head = await this.r2Service.head(key);
    if (!head) {
      return null;
    }

    return {
      size: head.size,
      contentType: head.httpMetadata?.contentType || 'application/octet-stream',
      lastModified: head.uploaded,
      etag: head.etag,
    };
  }

  /**
   * Get presigned upload URL
   * Note: R2 doesn't support this natively - consider using Workers for upload handling
   */
  async getPresignedUploadUrl(
    key: string,
    _contentType: string,
    _maxSize: number,
    _expiresIn = 900
  ): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    // R2 doesn't support presigned upload URLs like S3
    // For file uploads in Cloudflare Workers, handle uploads directly in Workers
    throw new Error(
      'R2 does not support presigned upload URLs. Handle uploads directly in your Workers endpoint.'
    );
  }
}
