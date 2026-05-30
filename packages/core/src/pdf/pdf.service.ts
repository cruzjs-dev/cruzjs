/**
 * PDF Service
 *
 * Central service for PDF generation.
 * Delegates to the underlying IPdfGenerator adapter.
 * Falls back to NoOpPdfGenerator if no platform adapter is injected,
 * which throws a helpful error on use.
 */

import { Injectable, Inject, Optional } from '../di';
import type { IPdfGenerator, PdfOptions } from './pdf.interface';
import { PDF_GENERATOR } from './pdf.interface';
import { NoOpPdfGenerator } from './no-op-pdf.generator';

@Injectable()
export class PdfService {
  private readonly generator: IPdfGenerator;

  constructor(
    @Inject(PDF_GENERATOR) @Optional() generator?: IPdfGenerator,
  ) {
    this.generator = generator ?? new NoOpPdfGenerator();
  }

  /** Generate a PDF from an HTML string */
  async fromHtml(html: string, options?: PdfOptions): Promise<Uint8Array> {
    return this.generator.fromHtml(html, options);
  }

  /** Generate a PDF from an HTML string with A4 portrait defaults */
  async fromHtmlA4(html: string): Promise<Uint8Array> {
    return this.generator.fromHtml(html, { format: 'A4', landscape: false });
  }

  /** Generate a landscape PDF from an HTML string */
  async fromHtmlLandscape(html: string, format?: 'A4' | 'Letter' | 'Legal'): Promise<Uint8Array> {
    return this.generator.fromHtml(html, { format: format ?? 'A4', landscape: true });
  }
}
