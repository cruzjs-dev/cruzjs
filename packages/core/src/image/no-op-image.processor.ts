/**
 * No-Op Image Processor
 *
 * Returns the input unchanged for all operations.
 * Used when no platform-specific adapter is configured.
 */

import type { IImageProcessor, ResizeOptions, CropOptions, ConvertOptions } from './image.interface';

export class NoOpImageProcessor implements IImageProcessor {
  async resize(input: Uint8Array, _options: ResizeOptions): Promise<Uint8Array> {
    return input;
  }

  async crop(input: Uint8Array, _options: CropOptions): Promise<Uint8Array> {
    return input;
  }

  async convert(input: Uint8Array, _options: ConvertOptions): Promise<Uint8Array> {
    return input;
  }

  async thumbnail(input: Uint8Array, _size?: number): Promise<Uint8Array> {
    return input;
  }
}
