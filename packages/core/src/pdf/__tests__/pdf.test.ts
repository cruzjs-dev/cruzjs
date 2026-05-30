/**
 * PDF Generation Unit Tests
 *
 * Tests for NoOpPdfGenerator error behavior and PdfService delegation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoOpPdfGenerator } from '../no-op-pdf.generator';
import { PdfService } from '../pdf.service';
import type { IPdfGenerator, PdfOptions } from '../pdf.interface';

// ─── NoOpPdfGenerator ───────────────────────────────────────────────────────

describe('NoOpPdfGenerator', () => {
  let generator: NoOpPdfGenerator;

  beforeEach(() => {
    generator = new NoOpPdfGenerator();
  });

  it('should throw a helpful error when fromHtml is called', async () => {
    await expect(generator.fromHtml('<h1>Hello</h1>')).rejects.toThrow(
      'PDF generation not configured. Add a PDF adapter (e.g., @cruzjs/adapter-docker for Puppeteer).',
    );
  });

  it('should throw even when options are provided', async () => {
    await expect(
      generator.fromHtml('<p>Test</p>', { format: 'A4', landscape: true }),
    ).rejects.toThrow('PDF generation not configured');
  });
});

// ─── PdfService ─────────────────────────────────────────────────────────────

describe('PdfService', () => {
  let mockGenerator: IPdfGenerator;
  let service: PdfService;
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

  beforeEach(() => {
    mockGenerator = {
      fromHtml: vi.fn().mockResolvedValue(pdfBytes),
    };
    service = new PdfService(mockGenerator);
  });

  it('should delegate fromHtml to generator', async () => {
    const html = '<h1>Invoice</h1>';
    const options: PdfOptions = { format: 'Letter', landscape: false };
    const result = await service.fromHtml(html, options);

    expect(result).toBe(pdfBytes);
    expect(mockGenerator.fromHtml).toHaveBeenCalledWith(html, options);
  });

  it('should delegate fromHtml without options', async () => {
    const html = '<p>Simple PDF</p>';
    const result = await service.fromHtml(html);

    expect(result).toBe(pdfBytes);
    expect(mockGenerator.fromHtml).toHaveBeenCalledWith(html, undefined);
  });

  it('should call fromHtmlA4 with A4 portrait defaults', async () => {
    const html = '<h1>Report</h1>';
    const result = await service.fromHtmlA4(html);

    expect(result).toBe(pdfBytes);
    expect(mockGenerator.fromHtml).toHaveBeenCalledWith(html, {
      format: 'A4',
      landscape: false,
    });
  });

  it('should call fromHtmlLandscape with landscape orientation', async () => {
    const html = '<table>Wide table</table>';
    const result = await service.fromHtmlLandscape(html, 'Legal');

    expect(result).toBe(pdfBytes);
    expect(mockGenerator.fromHtml).toHaveBeenCalledWith(html, {
      format: 'Legal',
      landscape: true,
    });
  });

  it('should default to A4 for fromHtmlLandscape when no format provided', async () => {
    const html = '<div>Content</div>';
    const result = await service.fromHtmlLandscape(html);

    expect(result).toBe(pdfBytes);
    expect(mockGenerator.fromHtml).toHaveBeenCalledWith(html, {
      format: 'A4',
      landscape: true,
    });
  });

  it('should fall back to NoOpPdfGenerator when no generator injected', async () => {
    const fallbackService = new PdfService();

    await expect(fallbackService.fromHtml('<h1>Test</h1>')).rejects.toThrow(
      'PDF generation not configured',
    );
  });
});
