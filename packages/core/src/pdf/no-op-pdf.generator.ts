/**
 * No-Op PDF Generator
 *
 * Throws a helpful error when PDF generation is attempted
 * without a configured adapter. Unlike the image no-op (which
 * passes through), PDFs cannot be meaningfully generated without
 * a real backend.
 */

import type { IPdfGenerator, PdfOptions } from './pdf.interface';

export class NoOpPdfGenerator implements IPdfGenerator {
  async fromHtml(_html: string, _options?: PdfOptions): Promise<Uint8Array> {
    throw new Error(
      'PDF generation not configured. Add a PDF adapter (e.g., @cruzjs/adapter-docker for Puppeteer).',
    );
  }
}
