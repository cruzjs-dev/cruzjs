import { injectable, inject, optional } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { uploads } from '../database/schema';
import { eq, and, lt, desc } from 'drizzle-orm';
import { StorageService } from '../shared/storage/storage.service.server';
import { ConfigService } from '../shared/config/config.service';
import {
  CreateUploadRequestInput,
  UploadRequest,
  UploadResponse,
  ConfirmUploadInput,
  FILE_VALIDATION_RULES,
  UploadType,
  UploadStatus,
  type ResizeOptions,
  type VariantResult,
} from './upload.models';
import { IMAGE_PROCESSOR, type IImageProcessor } from '../image/image.interface';
import { randomBytes } from 'crypto';

/**
 * Upload service for managing file uploads
 */
@injectable()
export class UploadService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(StorageService) private storageService: StorageService,
    @inject(ConfigService) private configService: ConfigService,
    @inject(IMAGE_PROCESSOR) @optional() private imageProcessor?: IImageProcessor
  ) {}
  /**
   * Request an upload - generates presigned URL and creates upload record
   * @param input - Upload request input
   * @param uploadType - Type of upload (avatar, document, image, video, general)
   * @returns Upload response with presigned URL
   */
  async requestUpload(
    input: CreateUploadRequestInput,
    uploadType: UploadType = 'general'
  ): Promise<UploadResponse> {
    // Validate file
    this.validateFile(input, uploadType);

    // TODO: Check user's storage quota (Task 30)
    // await this.checkStorageQuota(input.userId, input.fileSize);

    // Generate unique storage key
    const key = this.generateStorageKey(input.userId, input.fileName);

    // Generate presigned URL using storage service
    const validationRules = FILE_VALIDATION_RULES[uploadType];
    const storage = this.storageService.disk();
    const { url, expiresAt } = await storage.getPresignedUploadUrl(
      key,
      input.contentType,
      validationRules.maxSize
    );

    // Create upload record
    const bucketName = this.configService.get<string>('R2_BUCKET') || 'uploads';
    const [upload] = await this.db
      .insert(uploads)
      .values({
        userId: input.userId,
        filename: key.split('/').pop() || input.fileName,
        originalFilename: input.fileName,
        size: input.fileSize,
        mimeType: input.contentType,
        bucket: bucketName,
        key,
        status: 'PENDING',
      })
      .returning();

    return {
      id: upload.id,
      uploadUrl: url,
      key,
      expiresAt,
      contentType: input.contentType,
      maxSize: validationRules.maxSize,
    };
  }

  /**
   * Confirm upload completed - verifies file exists and updates status
   * @param input - Confirm upload input
   * @returns Updated upload record
   */
  async confirmUpload(input: ConfirmUploadInput): Promise<UploadRequest> {
    const [upload] = await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.id, input.uploadId))
      .limit(1);

    if (!upload) {
      throw new Error('Upload not found');
    }

    if (upload.status === 'COMPLETED') {
      return this.uploadToModel(upload);
    }

    // Verify file exists in storage
    const storage = this.storageService.disk();
    const exists = await storage.exists(input.key);
    if (!exists) {
      throw new Error('File not found in storage');
    }

    // Get file metadata
    const metadata = await storage.getMetadata(input.key);
    if (!metadata) {
      throw new Error('Failed to get file metadata');
    }

    // Verify key matches
    if (upload.key !== input.key) {
      throw new Error('Key mismatch');
    }

    // Update upload status
    const [updated] = await this.db
      .update(uploads)
      .set({
        status: 'COMPLETED',
        uploadedAt: new Date().toISOString(),
        // Optionally store public URL if bucket is public
        // url: this.generatePublicUrl(input.key),
      })
      .where(eq(uploads.id, input.uploadId))
      .returning();

    return this.uploadToModel(updated);
  }

  /**
   * Delete an upload and its file from storage
   * @param uploadId - Upload ID
   */
  async deleteUpload(uploadId: string): Promise<void> {
    const [upload] = await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    if (!upload) {
      throw new Error('Upload not found');
    }

    // Delete from storage
    const storage = this.storageService.disk();
    try {
      await storage.delete(upload.key);
    } catch (error) {
      // Log error but continue with database deletion
      console.error('Failed to delete storage object:', error);
    }

    // Delete from database
    await this.db.delete(uploads).where(eq(uploads.id, uploadId));
  }

  /**
   * Get upload by ID
   * @param uploadId - Upload ID
   * @returns Upload record
   */
  async getUpload(uploadId: string): Promise<UploadRequest | null> {
    const [upload] = await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    return upload ? this.uploadToModel(upload) : null;
  }

  /**
   * List user's uploads
   * @param userId - User ID
   * @param status - Optional status filter
   * @returns List of uploads
   */
  async listUserUploads(
    userId: string,
    status?: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED'
  ): Promise<UploadRequest[]> {
    const conditions = [eq(uploads.userId, userId)];
    if (status) {
      conditions.push(eq(uploads.status, status));
    }

    const userUploads = await this.db
      .select()
      .from(uploads)
      .where(and(...conditions))
      .orderBy(desc(uploads.createdAt));

    return userUploads.map((upload) => this.uploadToModel(upload));
  }

  /**
   * Generate image variants for an uploaded file.
   *
   * For each transform, the original image bytes are resized using the injected
   * IImageProcessor and the resulting variant is stored alongside the original
   * under a derived key: `${originalKey}-${width}x${height}.${format}`.
   *
   * If no IImageProcessor is bound (optional dependency), the method returns
   * an empty array without throwing.
   *
   * @param key - Storage key of the original file
   * @param transforms - Array of resize options to apply
   * @returns Array of variant results with storage keys and URLs
   */
  async variants(key: string, transforms: ResizeOptions[]): Promise<VariantResult[]> {
    if (!this.imageProcessor) {
      return [];
    }

    const storage = this.storageService.disk();
    const originalBytes = await storage.get(key);
    const input = new Uint8Array(originalBytes);

    const results: VariantResult[] = [];

    for (const transform of transforms) {
      try {
        const resized = await this.imageProcessor.resize(input, transform);
        const format = transform.format ?? 'jpeg';
        const width = transform.width ?? 0;
        const height = transform.height ?? 0;
        const variantKey = `${key}-${width}x${height}.${format}`;

        await storage.put(variantKey, Buffer.from(resized), {
          contentType: `image/${format}`,
        });

        const url = await storage.url(variantKey);

        results.push({
          transform,
          key: variantKey,
          url,
        });
      } catch (error) {
        // Skip failed transforms gracefully
        console.error(`Failed to generate variant for key "${key}":`, error);
      }
    }

    return results;
  }

  /**
   * Cleanup failed uploads older than specified hours
   * @param olderThanHours - Delete uploads older than this many hours (default: 24)
   * @returns Number of uploads deleted
   */
  async cleanupFailedUploads(olderThanHours = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const failedUploads = await this.db
      .select()
      .from(uploads)
      .where(and(eq(uploads.status, 'FAILED'), lt(uploads.createdAt, cutoffDate.toISOString())));

    let deletedCount = 0;
    for (const upload of failedUploads) {
      try {
        await this.deleteUpload(upload.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to cleanup upload ${upload.id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Validate file against upload type rules
   */
  private validateFile(
    input: CreateUploadRequestInput,
    uploadType: UploadType
  ): void {
    const rules = FILE_VALIDATION_RULES[uploadType];

    // Check file size
    if (input.fileSize > rules.maxSize) {
      throw new Error(
        `File size exceeds maximum of ${rules.maxSize / 1024 / 1024}MB`
      );
    }

    // Check content type
    if (rules.allowedTypes[0] !== '*') {
      const allowedTypes = rules.allowedTypes as readonly string[];
      if (!allowedTypes.includes(input.contentType)) {
        throw new Error(
          `Content type ${input.contentType} not allowed. Allowed types: ${allowedTypes.join(', ')}`
        );
      }
    }

    // Check file extension
    const extension = this.getFileExtension(input.fileName);
    if (rules.allowedExtensions[0] !== '*') {
      const allowedExtensions = rules.allowedExtensions as readonly string[];
      if (!allowedExtensions.includes(extension.toLowerCase())) {
        throw new Error(
          `File extension ${extension} not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
        );
      }
    }
  }

  /**
   * Generate unique storage key for file
   */
  private generateStorageKey(userId: string, fileName: string): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `uploads/${userId}/${timestamp}-${random}-${sanitizedFileName}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  /**
   * Convert Drizzle upload to model
   */
  private uploadToModel(upload: typeof uploads.$inferSelect): UploadRequest {
    return {
      id: upload.id,
      userId: upload.userId ?? '',
      fileName: upload.originalFilename,
      fileSize: upload.size,
      contentType: upload.mimeType,
      key: upload.key,
      status: upload.status as UploadStatus,
      url: upload.url || undefined,
      uploadedAt: upload.uploadedAt ? new Date(upload.uploadedAt) : undefined,
      createdAt: new Date(upload.createdAt),
    };
  }
}

