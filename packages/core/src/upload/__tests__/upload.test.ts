/**
 * Upload Service Unit Tests
 *
 * Tests for file validation, requestUpload, confirmUpload,
 * deleteUpload, and variants generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadService } from '../upload.service';
import type {
  CreateUploadRequestInput,
  ResizeOptions,
} from '../upload.models';
import type { StorageDriver } from '../../shared/storage/storage.interface';
import type { IImageProcessor } from '../../image/image.interface';

// ---------------------------------------------------------------------------
// Mock storage driver
// ---------------------------------------------------------------------------

function createMockStorageDriver(): StorageDriver {
  return {
    put: vi.fn().mockResolvedValue('mock-key'),
    get: vi.fn().mockResolvedValue(Buffer.from('fake-image-bytes')),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
    getMetadata: vi.fn().mockResolvedValue({
      size: 1024,
      contentType: 'image/png',
      lastModified: new Date(),
      etag: 'fake-etag',
    }),
    url: vi.fn().mockImplementation(async (key: string) => `https://cdn.example.com/${key}`),
    signedUrl: vi.fn().mockResolvedValue('https://signed.example.com/file'),
    getPresignedUploadUrl: vi.fn().mockResolvedValue({
      url: 'https://upload.example.com/presigned',
      expiresAt: new Date(Date.now() + 900_000),
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock storage service (wraps driver via .disk())
// ---------------------------------------------------------------------------

function createMockStorageService(driver: StorageDriver) {
  return {
    disk: vi.fn().mockReturnValue(driver),
  };
}

// ---------------------------------------------------------------------------
// Mock config service
// ---------------------------------------------------------------------------

function createMockConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn().mockImplementation(<T>(key: string, defaultValue?: T): T | undefined => {
      if (key in overrides) {
        return overrides[key] as T;
      }
      return defaultValue;
    }),
    getOrThrow: vi.fn().mockImplementation(<T>(key: string): T => {
      if (key in overrides) {
        return overrides[key] as T;
      }
      throw new Error(`Config key "${key}" not found`);
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock database
// ---------------------------------------------------------------------------

function createMockDb() {
  const mockInsertReturning = vi.fn().mockResolvedValue([{
    id: 'upload-1',
    userId: 'user-1',
    filename: 'test.png',
    originalFilename: 'test.png',
    size: 1024,
    mimeType: 'image/png',
    bucket: 'uploads',
    key: 'uploads/user-1/123-test.png',
    status: 'PENDING',
    url: null,
    metadata: '{}',
    createdAt: new Date().toISOString(),
    uploadedAt: null,
  }]);

  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

  const mockSelectLimit = vi.fn().mockResolvedValue([{
    id: 'upload-1',
    userId: 'user-1',
    filename: 'test.png',
    originalFilename: 'test.png',
    size: 1024,
    mimeType: 'image/png',
    bucket: 'uploads',
    key: 'uploads/user-1/123-test.png',
    status: 'PENDING',
    url: null,
    metadata: '{}',
    createdAt: new Date().toISOString(),
    uploadedAt: null,
  }]);

  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectFrom = vi.fn().mockReturnValue({
    where: mockSelectWhere,
    orderBy: vi.fn().mockResolvedValue([]),
  });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  const mockUpdateReturning = vi.fn().mockResolvedValue([{
    id: 'upload-1',
    userId: 'user-1',
    filename: 'test.png',
    originalFilename: 'test.png',
    size: 1024,
    mimeType: 'image/png',
    bucket: 'uploads',
    key: 'uploads/user-1/123-test.png',
    status: 'COMPLETED',
    url: null,
    metadata: '{}',
    createdAt: new Date().toISOString(),
    uploadedAt: new Date().toISOString(),
  }]);

  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

  return {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
    _mocks: {
      insertReturning: mockInsertReturning,
      insertValues: mockInsertValues,
      selectLimit: mockSelectLimit,
      selectWhere: mockSelectWhere,
      selectFrom: mockSelectFrom,
      updateReturning: mockUpdateReturning,
      updateWhere: mockUpdateWhere,
      updateSet: mockUpdateSet,
      deleteWhere: mockDeleteWhere,
    },
  };
}

// ---------------------------------------------------------------------------
// Mock image processor
// ---------------------------------------------------------------------------

function createMockImageProcessor(): IImageProcessor {
  return {
    resize: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    crop: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    convert: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    thumbnail: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
}

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------

type CreateServiceOptions = {
  driver?: StorageDriver;
  configOverrides?: Record<string, unknown>;
  imageProcessor?: IImageProcessor;
};

function createService(options: CreateServiceOptions = {}) {
  const driver = options.driver ?? createMockStorageDriver();
  const storageService = createMockStorageService(driver);
  const configService = createMockConfigService(options.configOverrides ?? { R2_BUCKET: 'test-uploads' });
  const db = createMockDb();

  const service = new (UploadService as unknown as new (
    db: ReturnType<typeof createMockDb>,
    storageService: ReturnType<typeof createMockStorageService>,
    configService: ReturnType<typeof createMockConfigService>,
    imageProcessor?: IImageProcessor,
  ) => UploadService)(db, storageService, configService, options.imageProcessor);

  return { service, db, driver, storageService, configService };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UploadService', () => {
  // ─── validateFile (tested via requestUpload) ───────────────────────────────

  describe('file validation (via requestUpload)', () => {
    it('should throw when file size exceeds maximum for the upload type', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'photo.png',
        fileSize: 100 * 1024 * 1024, // 100MB, exceeds image limit of 10MB
        contentType: 'image/png',
      };

      await expect(service.requestUpload(input, 'image')).rejects.toThrow(
        /File size exceeds maximum/
      );
    });

    it('should throw when content type is not allowed for the upload type', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'report.pdf',
        fileSize: 1024,
        contentType: 'application/pdf',
      };

      // 'image' upload type does not allow 'application/pdf'
      await expect(service.requestUpload(input, 'image')).rejects.toThrow(
        /Content type application\/pdf not allowed/
      );
    });

    it('should throw when file extension is not allowed for the upload type', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'virus.exe',
        fileSize: 1024,
        contentType: 'image/png', // lie about content type
      };

      // 'image' type only allows image extensions
      await expect(service.requestUpload(input, 'image')).rejects.toThrow(
        /File extension .exe not allowed/
      );
    });

    it('should accept valid files within limits', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'photo.png',
        fileSize: 1024,
        contentType: 'image/png',
      };

      const result = await service.requestUpload(input, 'image');
      expect(result).toBeDefined();
      expect(result.uploadUrl).toBeDefined();
    });

    it('should accept any content type for general upload type', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'data.csv',
        fileSize: 1024,
        contentType: 'text/csv',
      };

      const result = await service.requestUpload(input, 'general');
      expect(result).toBeDefined();
      expect(result.uploadUrl).toBeDefined();
    });
  });

  // ─── requestUpload ─────────────────────────────────────────────────────────

  describe('requestUpload', () => {
    it('should return an upload response with presigned URL', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'photo.jpg',
        fileSize: 5000,
        contentType: 'image/jpeg',
      };

      const result = await service.requestUpload(input, 'image');

      expect(result.id).toBe('upload-1');
      expect(result.uploadUrl).toBe('https://upload.example.com/presigned');
      expect(result.key).toMatch(/^uploads\/user-1\//);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.maxSize).toBe(10 * 1024 * 1024); // image max
    });

    it('should generate a storage key with userId and sanitized filename', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-42',
        fileName: 'my photo (1).jpg',
        fileSize: 1000,
        contentType: 'image/jpeg',
      };

      const result = await service.requestUpload(input, 'image');

      expect(result.key).toContain('user-42');
      // Parentheses and spaces are replaced with underscores
      expect(result.key).toMatch(/my_photo__1_.jpg$/);
    });

    it('should call getPresignedUploadUrl on the storage driver', async () => {
      const driver = createMockStorageDriver();
      const { service } = createService({ driver });

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'doc.pdf',
        fileSize: 1024,
        contentType: 'application/pdf',
      };

      await service.requestUpload(input, 'document');

      expect(driver.getPresignedUploadUrl).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(driver.getPresignedUploadUrl).mock.calls[0];
      expect(callArgs[1]).toBe('application/pdf');
      // maxSize for document type is 10MB
      expect(callArgs[2]).toBe(10 * 1024 * 1024);
    });

    it('should insert a record in the database with PENDING status', async () => {
      const { service, db } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'photo.png',
        fileSize: 2048,
        contentType: 'image/png',
      };

      await service.requestUpload(input, 'image');

      expect(db.insert).toHaveBeenCalledTimes(1);
      const valuesCall = db._mocks.insertValues.mock.calls[0][0];
      expect(valuesCall.userId).toBe('user-1');
      expect(valuesCall.originalFilename).toBe('photo.png');
      expect(valuesCall.size).toBe(2048);
      expect(valuesCall.mimeType).toBe('image/png');
      expect(valuesCall.status).toBe('PENDING');
    });

    it('should default to general upload type when none specified', async () => {
      const { service } = createService();

      const input: CreateUploadRequestInput = {
        userId: 'user-1',
        fileName: 'anything.zip',
        fileSize: 1024,
        contentType: 'application/zip',
      };

      // general type allows any content type and extension
      const result = await service.requestUpload(input);
      expect(result).toBeDefined();
      expect(result.maxSize).toBe(50 * 1024 * 1024); // general max
    });
  });

  // ─── confirmUpload ─────────────────────────────────────────────────────────

  describe('confirmUpload', () => {
    it('should update upload status to COMPLETED', async () => {
      const { service, db } = createService();

      const result = await service.confirmUpload({
        uploadId: 'upload-1',
        key: 'uploads/user-1/123-test.png',
      });

      expect(result.status).toBe('COMPLETED');
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('should verify file exists in storage', async () => {
      const driver = createMockStorageDriver();
      const { service } = createService({ driver });

      await service.confirmUpload({
        uploadId: 'upload-1',
        key: 'uploads/user-1/123-test.png',
      });

      expect(driver.exists).toHaveBeenCalledWith('uploads/user-1/123-test.png');
    });

    it('should throw when upload not found', async () => {
      const { service, db } = createService();
      db._mocks.selectLimit.mockResolvedValueOnce([]);

      await expect(
        service.confirmUpload({ uploadId: 'nonexistent', key: 'some-key' })
      ).rejects.toThrow('Upload not found');
    });

    it('should throw when file not found in storage', async () => {
      const driver = createMockStorageDriver();
      vi.mocked(driver.exists).mockResolvedValue(false);
      const { service } = createService({ driver });

      await expect(
        service.confirmUpload({
          uploadId: 'upload-1',
          key: 'uploads/user-1/123-test.png',
        })
      ).rejects.toThrow('File not found in storage');
    });

    it('should throw when key does not match', async () => {
      const { service } = createService();

      await expect(
        service.confirmUpload({
          uploadId: 'upload-1',
          key: 'wrong-key',
        })
      ).rejects.toThrow('Key mismatch');
    });

    it('should return existing model when upload is already COMPLETED', async () => {
      const { service, db } = createService();

      db._mocks.selectLimit.mockResolvedValueOnce([{
        id: 'upload-1',
        userId: 'user-1',
        filename: 'test.png',
        originalFilename: 'test.png',
        size: 1024,
        mimeType: 'image/png',
        bucket: 'uploads',
        key: 'uploads/user-1/123-test.png',
        status: 'COMPLETED',
        url: null,
        metadata: '{}',
        createdAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
      }]);

      const result = await service.confirmUpload({
        uploadId: 'upload-1',
        key: 'uploads/user-1/123-test.png',
      });

      expect(result.status).toBe('COMPLETED');
      // Should not call update since it was already completed
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteUpload ──────────────────────────────────────────────────────────

  describe('deleteUpload', () => {
    it('should delete file from storage and database', async () => {
      const driver = createMockStorageDriver();
      const { service, db } = createService({ driver });

      await service.deleteUpload('upload-1');

      expect(driver.delete).toHaveBeenCalledWith('uploads/user-1/123-test.png');
      expect(db.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw when upload not found', async () => {
      const { service, db } = createService();
      db._mocks.selectLimit.mockResolvedValueOnce([]);

      await expect(service.deleteUpload('nonexistent')).rejects.toThrow('Upload not found');
    });

    it('should still delete from database if storage deletion fails', async () => {
      const driver = createMockStorageDriver();
      vi.mocked(driver.delete).mockRejectedValue(new Error('Storage error'));
      const { service, db } = createService({ driver });

      // Should not throw even though storage delete fails
      await service.deleteUpload('upload-1');

      // Database delete should still happen
      expect(db.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getUpload ─────────────────────────────────────────────────────────────

  describe('getUpload', () => {
    it('should return upload model when found', async () => {
      const { service } = createService();

      const result = await service.getUpload('upload-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('upload-1');
      expect(result!.userId).toBe('user-1');
      expect(result!.status).toBe('PENDING');
    });

    it('should return null when upload not found', async () => {
      const { service, db } = createService();
      db._mocks.selectLimit.mockResolvedValueOnce([]);

      const result = await service.getUpload('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─── variants ──────────────────────────────────────────────────────────────

  describe('variants', () => {
    it('should return empty array when imageProcessor is not injected', async () => {
      const { service } = createService({ imageProcessor: undefined });

      const transforms: ResizeOptions[] = [
        { width: 200, height: 200, fit: 'cover' },
      ];

      const results = await service.variants('some-key', transforms);

      expect(results).toEqual([]);
    });

    it('should generate variants for each transform', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      const transforms: ResizeOptions[] = [
        { width: 200, height: 200, fit: 'cover', format: 'webp' },
        { width: 800, height: 600, format: 'jpeg' },
      ];

      const results = await service.variants('uploads/user-1/photo.jpg', transforms);

      expect(results).toHaveLength(2);

      // First variant
      expect(results[0].key).toBe('uploads/user-1/photo.jpg-200x200.webp');
      expect(results[0].url).toBe('https://cdn.example.com/uploads/user-1/photo.jpg-200x200.webp');
      expect(results[0].transform).toEqual(transforms[0]);

      // Second variant
      expect(results[1].key).toBe('uploads/user-1/photo.jpg-800x600.jpeg');
      expect(results[1].url).toBe('https://cdn.example.com/uploads/user-1/photo.jpg-800x600.jpeg');
      expect(results[1].transform).toEqual(transforms[1]);
    });

    it('should fetch original file from storage', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      await service.variants('uploads/user-1/photo.jpg', [
        { width: 100, height: 100 },
      ]);

      expect(driver.get).toHaveBeenCalledWith('uploads/user-1/photo.jpg');
    });

    it('should call imageProcessor.resize for each transform', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      const transforms: ResizeOptions[] = [
        { width: 150, height: 150, fit: 'cover', quality: 80 },
        { width: 300, height: 300, fit: 'contain' },
      ];

      await service.variants('key', transforms);

      expect(imageProcessor.resize).toHaveBeenCalledTimes(2);
      expect(imageProcessor.resize).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        transforms[0]
      );
      expect(imageProcessor.resize).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        transforms[1]
      );
    });

    it('should upload resized variant to storage with correct content type', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      await service.variants('key', [
        { width: 100, height: 100, format: 'png' },
      ]);

      expect(driver.put).toHaveBeenCalledTimes(1);
      expect(driver.put).toHaveBeenCalledWith(
        'key-100x100.png',
        expect.any(Buffer),
        { contentType: 'image/png' }
      );
    });

    it('should default format to jpeg when not specified', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      await service.variants('key', [
        { width: 100, height: 100 },
      ]);

      expect(driver.put).toHaveBeenCalledWith(
        'key-100x100.jpeg',
        expect.any(Buffer),
        { contentType: 'image/jpeg' }
      );
    });

    it('should use 0 for missing width or height in the variant key', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      await service.variants('key', [
        { width: 400 }, // no height
      ]);

      expect(driver.put).toHaveBeenCalledWith(
        'key-400x0.jpeg',
        expect.any(Buffer),
        { contentType: 'image/jpeg' }
      );
    });

    it('should skip failed transforms gracefully and continue processing', async () => {
      const imageProcessor = createMockImageProcessor();
      vi.mocked(imageProcessor.resize)
        .mockRejectedValueOnce(new Error('Resize failed'))
        .mockResolvedValueOnce(new Uint8Array([4, 5, 6]));

      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      const results = await service.variants('key', [
        { width: 100, height: 100 },
        { width: 200, height: 200 },
      ]);

      // Only the second transform should succeed
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('key-200x200.jpeg');
    });

    it('should return empty array for empty transforms', async () => {
      const imageProcessor = createMockImageProcessor();
      const driver = createMockStorageDriver();
      const { service } = createService({ driver, imageProcessor });

      const results = await service.variants('key', []);

      expect(results).toEqual([]);
      expect(driver.get).toHaveBeenCalledTimes(1);
      expect(imageProcessor.resize).not.toHaveBeenCalled();
    });
  });
});
