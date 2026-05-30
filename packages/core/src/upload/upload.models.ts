import { config } from '../shared/config';

// Default file validation rules (used when config not yet initialized)
const defaultFileValidationRules = {
  avatar: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  document: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
  },
  image: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
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

// Lazy getter to avoid accessing config at module load time (Cloudflare Workers compatibility)
export const getFileValidationRules = () => config.upload?.fileValidationRules ?? defaultFileValidationRules;

// Re-export for convenience (lazy via getter)
export const fileValidationRules = new Proxy({} as typeof defaultFileValidationRules, {
  get(_target, prop: string) {
    return getFileValidationRules()[prop as keyof typeof defaultFileValidationRules];
  },
});
export type UploadType = keyof typeof defaultFileValidationRules;

/**
 * Upload module types and models
 */

export type UploadStatus = 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';

export type UploadRequest = {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  key: string;
  status: UploadStatus;
  url?: string;
  uploadedAt?: Date;
  createdAt: Date;
};

export type CreateUploadRequestInput = {
  userId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
};

export type UploadResponse = {
  id: string;
  uploadUrl: string;
  key: string;
  expiresAt: Date;
  contentType: string;
  maxSize: number;
};

export type ConfirmUploadInput = {
  uploadId: string;
  key: string;
};

/**
 * Resize options for generating image variants.
 */
export type ResizeOptions = {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
};

/**
 * Result of a single variant generation.
 */
export type VariantResult = {
  transform: ResizeOptions;
  key: string;
  url: string;
};

/**
 * File validation rules per upload type
 * Re-exported from config for backward compatibility
 */
export const FILE_VALIDATION_RULES = fileValidationRules;

