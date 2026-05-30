/**
 * PDF Generator Interface
 *
 * Provider-agnostic interface for PDF generation.
 * Implementations may use Puppeteer, wkhtmltopdf, Chromium, etc.
 */

import { createToken } from '../di/tokens/create-token';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PdfMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export type PdfPageFormat = 'A4' | 'Letter' | 'Legal';

export interface PdfOptions {
  /** Page format (default: A4) */
  format?: PdfPageFormat;
  /** Landscape orientation (default: false) */
  landscape?: boolean;
  /** Page margins in pixels */
  margin?: PdfMargin;
}

// ─── Interface ─────────────────────────────────────────────────────────────

export interface IPdfGenerator {
  /** Generate a PDF from an HTML string */
  fromHtml(html: string, options?: PdfOptions): Promise<Uint8Array>;
}

// ─── DI Token ──────────────────────────────────────────────────────────────

/** DI token for injecting a platform-specific IPdfGenerator */
export const PDF_GENERATOR = createToken<IPdfGenerator>('PDF_GENERATOR');
