/**
 * R2 Storage Service
 *
 * Provides Cloudflare R2 storage operations.
 * This is a stub implementation - actual R2 bindings are injected at runtime
 * in the Cloudflare Workers environment.
 */

import { createToken } from '../../di';
import { injectable } from 'inversify';
import { CloudflareContext } from './context';

export const R2_SERVICE = createToken<R2Service>('R2Service');

export interface R2ObjectMetadata {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    cacheExpiry?: Date;
  };
  customMetadata?: Record<string, string>;
}

@injectable()
export class R2Service {
  private bucket: string;
  // R2 bucket binding will be injected at runtime
  private r2Bucket: any = null;

  constructor() {
    const infraName = process.env.INFRASTRUCTURE_NAME || 'app';
    this.bucket = process.env.R2_BUCKET || `${infraName}-uploads`;
  }

  /**
   * Set the R2 bucket binding (called from Workers entry point)
   */
  setR2Bucket(bucket: any): void {
    this.r2Bucket = bucket;
  }

  /**
   * Resolve the active R2 bucket binding.
   * Prefers an explicitly-set binding (Workers entry via setR2Bucket); otherwise
   * falls back to the per-request binding on CloudflareContext (Pages SSR path).
   */
  private get binding(): any {
    const bucket = this.r2Bucket ?? CloudflareContext.r2;
    if (!bucket) {
      throw new Error(
        'R2 bucket not available: no binding set and CloudflareContext.r2 is null.'
      );
    }
    return bucket;
  }

  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Put an object into R2
   */
  async put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentDisposition?: string;
        contentEncoding?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<R2ObjectMetadata> {
    const bucket = this.binding;

    const result = await bucket.put(key, value, options);
    return {
      key: result.key,
      size: result.size,
      etag: result.etag,
      httpEtag: result.httpEtag,
      uploaded: result.uploaded,
      httpMetadata: result.httpMetadata,
      customMetadata: result.customMetadata,
    };
  }

  /**
   * Get an object from R2
   */
  async get(key: string): Promise<{
    body: ReadableStream;
    metadata: R2ObjectMetadata;
  } | null> {
    const bucket = this.binding;

    const result = await bucket.get(key);
    if (!result) {
      return null;
    }

    return {
      body: result.body,
      metadata: {
        key: result.key,
        size: result.size,
        etag: result.etag,
        httpEtag: result.httpEtag,
        uploaded: result.uploaded,
        httpMetadata: result.httpMetadata,
        customMetadata: result.customMetadata,
      },
    };
  }

  /**
   * Get object as ArrayBuffer
   */
  async getAsBuffer(key: string): Promise<Buffer | null> {
    const result = await this.get(key);
    if (!result) {
      return null;
    }

    const arrayBuffer = await new Response(result.body).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete an object from R2
   */
  async delete(key: string): Promise<void> {
    const bucket = this.binding;

    await bucket.delete(key);
  }

  /**
   * Check if an object exists
   */
  async exists(key: string): Promise<boolean> {
    const bucket = this.binding;

    const head = await bucket.head(key);
    return head !== null;
  }

  /**
   * Get object metadata without downloading
   */
  async head(key: string): Promise<R2ObjectMetadata | null> {
    const bucket = this.binding;

    const result = await bucket.head(key);
    if (!result) {
      return null;
    }

    return {
      key: result.key,
      size: result.size,
      etag: result.etag,
      httpEtag: result.httpEtag,
      uploaded: result.uploaded,
      httpMetadata: result.httpMetadata,
      customMetadata: result.customMetadata,
    };
  }

  /**
   * List objects with optional prefix
   */
  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    objects: R2ObjectMetadata[];
    truncated: boolean;
    cursor?: string;
  }> {
    const bucket = this.binding;

    const result = await bucket.list(options);

    return {
      objects: result.objects.map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        httpEtag: obj.httpEtag,
        uploaded: obj.uploaded,
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata,
      })),
      truncated: result.truncated,
      cursor: result.cursor,
    };
  }

  /**
   * Generate a public URL (requires public bucket or custom domain)
   */
  getPublicUrl(key: string): string {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
    // Default to Cloudflare's R2 public URL format (if enabled)
    return `https://pub-${this.bucket}.r2.dev/${key}`;
  }
}
