/**
 * Image Service
 *
 * Central service for image processing operations.
 * Delegates to the underlying IImageProcessor adapter.
 * Falls back to NoOpImageProcessor if no platform adapter is injected.
 */

import { Injectable, Inject, Optional } from '../di';
import type { IImageProcessor, ResizeOptions, CropOptions, ConvertOptions, ImageFormat } from './image.interface';
import { IMAGE_PROCESSOR } from './image.interface';
import { NoOpImageProcessor } from './no-op-image.processor';

@Injectable()
export class ImageService {
  private readonly processor: IImageProcessor;

  constructor(
    @Inject(IMAGE_PROCESSOR) @Optional() processor?: IImageProcessor,
  ) {
    this.processor = processor ?? new NoOpImageProcessor();
  }

  /** Resize an image to the given dimensions */
  async resize(input: Uint8Array, options: ResizeOptions): Promise<Uint8Array> {
    return this.processor.resize(input, options);
  }

  /** Crop a region from an image */
  async crop(input: Uint8Array, options: CropOptions): Promise<Uint8Array> {
    return this.processor.crop(input, options);
  }

  /** Convert an image to a different format */
  async convert(input: Uint8Array, options: ConvertOptions): Promise<Uint8Array> {
    return this.processor.convert(input, options);
  }

  /** Generate a square thumbnail (default 150px) */
  async thumbnail(input: Uint8Array, size?: number): Promise<Uint8Array> {
    return this.processor.thumbnail(input, size);
  }

  /**
   * Convenience: resize and convert in one step.
   * Resizes first, then converts to the target format.
   */
  async resizeAndConvert(
    input: Uint8Array,
    resize: Omit<ResizeOptions, 'format'>,
    format: ImageFormat,
    quality?: number,
  ): Promise<Uint8Array> {
    const resized = await this.processor.resize(input, resize);
    return this.processor.convert(resized, { format, quality });
  }
}
