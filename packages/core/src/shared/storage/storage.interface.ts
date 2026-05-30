/**
 * Options for putting files
 */
export type PutOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
};

/**
 * Storage driver interface
 * All storage drivers must implement this interface
 */
export type StorageDriver = {
  /**
   * Put a file into storage
   * @param key - Storage key (path)
   * @param content - File content as Buffer or string
   * @param options - Optional put options
   * @returns The storage key where the file was saved
   */
  put(
    key: string,
    content: Buffer | string,
    options?: PutOptions
  ): Promise<string>;

  /**
   * Get a file from storage
   * @param key - Storage key (path)
   * @returns File content as Buffer
   */
  get(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param key - Storage key (path)
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param key - Storage key (path)
   * @returns True if file exists, false otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param key - Storage key (path)
   * @returns File metadata or null if not found
   */
  getMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
  } | null>;

  /**
   * Get public URL for a file (if bucket is public)
   * @param key - Storage key (path)
   * @returns Public URL or throws if not supported
   */
  url(key: string): Promise<string>;

  /**
   * Get presigned URL for temporary access (for downloads/reads)
   * @param key - Storage key (path)
   * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
   * @returns Presigned URL
   */
  signedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Get presigned URL for uploading a file (for client-side uploads)
   * @param key - Storage key (path)
   * @param contentType - MIME type of the file
   * @param maxSize - Maximum file size in bytes
   * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
   * @returns Presigned upload URL and expiration date
   */
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    maxSize: number,
    expiresIn?: number
  ): Promise<{
    url: string;
    expiresAt: Date;
  }>;
};

