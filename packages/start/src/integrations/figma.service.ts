import { Injectable } from '@cruzjs/core/di';
import type { FigmaIntegrationConfig, FigmaEmbedData } from './integration.types';

/**
 * FigmaService
 *
 * Provides Figma URL embedding with oEmbed preview.
 * Validates Figma URLs, fetches oEmbed metadata, and returns
 * embed data suitable for rendering in work item specs.
 *
 * Figma oEmbed endpoint:
 *   https://www.figma.com/api/oembed?url={figmaUrl}
 */
@Injectable()
export class FigmaService {
  private static readonly OEMBED_URL = 'https://www.figma.com/api/oembed';
  private static readonly FIGMA_URL_PATTERN = /^https:\/\/([\w-]+\.)?figma\.com\/(file|proto|design|board|slides|deck)\//;

  /**
   * Test a Figma connection by validating the access token
   */
  async testConnection(config: FigmaIntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.figma.com/v1/me', {
        headers: {
          'X-Figma-Token': config.accessToken,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Figma authentication failed: ${response.status}`,
        };
      }

      const user = await response.json() as { handle: string; email: string };
      return {
        success: true,
        message: `Connected as ${user.handle} (${user.email})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate that a URL is a valid Figma URL
   */
  isValidFigmaUrl(url: string): boolean {
    return FigmaService.FIGMA_URL_PATTERN.test(url);
  }

  /**
   * Fetch oEmbed data for a Figma URL
   *
   * Uses the public Figma oEmbed API endpoint which does not require
   * authentication for fetching embed metadata.
   */
  async getEmbed(url: string): Promise<FigmaEmbedData> {
    if (!this.isValidFigmaUrl(url)) {
      throw new Error('Invalid Figma URL. Must be a figma.com file, proto, design, board, slides, or deck URL.');
    }

    try {
      const oembedUrl = `${FigmaService.OEMBED_URL}?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error(`Figma oEmbed request failed: ${response.status}`);
      }

      const data = await response.json() as {
        title?: string;
        thumbnail_url?: string;
        width?: number;
        height?: number;
      };

      return {
        url,
        title: data.title ?? 'Figma Design',
        thumbnailUrl: data.thumbnail_url ?? null,
        width: data.width ?? 800,
        height: data.height ?? 600,
        provider: 'figma',
      };
    } catch (error) {
      // Fallback: return basic embed data without oEmbed metadata
      return {
        url,
        title: 'Figma Design',
        thumbnailUrl: null,
        width: 800,
        height: 600,
        provider: 'figma',
      };
    }
  }

  /**
   * Build an iframe-safe embed URL from a Figma file URL
   *
   * Converts regular Figma URLs to embed format:
   *   https://www.figma.com/file/{key}/... -> https://www.figma.com/embed?embed_host=cruzjs&url={original}
   */
  getEmbedUrl(figmaUrl: string): string {
    if (!this.isValidFigmaUrl(figmaUrl)) {
      throw new Error('Invalid Figma URL');
    }

    return `https://www.figma.com/embed?embed_host=cruzjs&url=${encodeURIComponent(figmaUrl)}`;
  }
}
