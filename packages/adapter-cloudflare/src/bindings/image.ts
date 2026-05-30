/**
 * Cloudflare Image Processor
 *
 * Implements IImageProcessor using Cloudflare's Image Resizing API.
 * In production, Cloudflare Workers can use `fetch()` with the `cf.image`
 * options to transform images on the fly.
 *
 * Since the interface operates on raw bytes (Uint8Array in/out),
 * this adapter currently returns the input unchanged. Full integration
 * with the Cloudflare Images API requires an account with Image Resizing
 * enabled and a publicly-accessible source URL.
 *
 * TODO: Implement full Cloudflare Images API integration:
 *   - Upload input bytes to R2 or a temp URL
 *   - Use `/cdn-cgi/image/` URL format or `fetch()` with `cf.image` options
 *   - Download the transformed result as Uint8Array
 */

import type {
  IImageProcessor,
  ResizeOptions,
  CropOptions,
  ConvertOptions,
} from '@cruzjs/core/image';

export class CloudflareImageProcessor implements IImageProcessor {
  /**
   * @param _accountId - Cloudflare account ID (for future Images API use)
   */
  constructor(private readonly _accountId: string | null = null) {}

  async resize(input: Uint8Array, _options: ResizeOptions): Promise<Uint8Array> {
    // TODO: Use fetch() with cf.image options for real resizing
    // Example: fetch(url, { cf: { image: { width, height, fit } } })
    return input;
  }

  async crop(input: Uint8Array, _options: CropOptions): Promise<Uint8Array> {
    // TODO: Use cf.image trim/crop options
    return input;
  }

  async convert(input: Uint8Array, _options: ConvertOptions): Promise<Uint8Array> {
    // TODO: Use cf.image format option for conversion
    return input;
  }

  async thumbnail(input: Uint8Array, _size?: number): Promise<Uint8Array> {
    // TODO: Use cf.image with width=height=size, fit=cover
    return input;
  }
}
