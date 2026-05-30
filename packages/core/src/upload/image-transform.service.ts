import { injectable, inject } from 'inversify';
import { ConfigService } from '../shared/config/config.service';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  quality?: number;
}

export interface ImageTransformResult {
  key: string;
  url: string;
}

@injectable()
export class ImageTransformService {
  constructor(
    @inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /**
   * Returns a URL for a transformed image using Cloudflare Image Resizing.
   * Requires Workers Paid plan with Image Resizing enabled.
   *
   * URL format: <baseUrl>/<key>?<transform params>
   * Cloudflare's Workers will rewrite the fetch with cf.image options at the edge.
   */
  getTransformUrl(key: string, transforms: ImageTransformOptions): string {
    const baseUrl = this.config.get<string>('R2_PUBLIC_URL') || this.config.get<string>('APP_URL') || '';
    const imageUrl = `${baseUrl.replace(/\/$/, '')}/${key}`;

    const params = new URLSearchParams();
    if (transforms.width) params.set('w', String(transforms.width));
    if (transforms.height) params.set('h', String(transforms.height));
    if (transforms.fit) params.set('fit', transforms.fit);
    if (transforms.format) params.set('f', transforms.format);
    if (transforms.quality) params.set('q', String(transforms.quality));

    const qs = params.toString();
    return qs ? `${imageUrl}?${qs}` : imageUrl;
  }

  /**
   * Returns transform URL parameters suitable for passing to Cloudflare's
   * cf.image fetch option in a Worker.
   */
  buildCfImageOptions(transforms: ImageTransformOptions): Record<string, unknown> {
    const opts: Record<string, unknown> = {};
    if (transforms.width) opts['width'] = transforms.width;
    if (transforms.height) opts['height'] = transforms.height;
    if (transforms.fit) opts['fit'] = transforms.fit;
    if (transforms.format) opts['format'] = transforms.format;
    if (transforms.quality) opts['quality'] = transforms.quality;
    return opts;
  }
}
