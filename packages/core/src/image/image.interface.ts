/**
 * Image Processor Interface
 *
 * Provider-agnostic interface for image processing operations.
 * Implementations may use Cloudflare Images, Sharp, Jimp, etc.
 */

import { createToken } from '../di/tokens/create-token';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
  format?: ImageFormat;
  quality?: number;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  format?: ImageFormat;
}

export interface ConvertOptions {
  format: ImageFormat;
  quality?: number;
}

// ─── Interface ─────────────────────────────────────────────────────────────

export interface IImageProcessor {
  /** Resize an image to the given dimensions */
  resize(input: Uint8Array, options: ResizeOptions): Promise<Uint8Array>;

  /** Crop a region from an image */
  crop(input: Uint8Array, options: CropOptions): Promise<Uint8Array>;

  /** Convert an image to a different format */
  convert(input: Uint8Array, options: ConvertOptions): Promise<Uint8Array>;

  /** Generate a square thumbnail (default 150px) */
  thumbnail(input: Uint8Array, size?: number): Promise<Uint8Array>;
}

// ─── DI Token ──────────────────────────────────────────────────────────────

/** DI token for injecting a platform-specific IImageProcessor */
export const IMAGE_PROCESSOR = createToken<IImageProcessor>('IMAGE_PROCESSOR');
