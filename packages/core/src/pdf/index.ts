/**
 * @cruzjs/core PDF Generation
 *
 * Provider-agnostic PDF generation from HTML content.
 */

// Types & Interface
export type {
  PdfMargin,
  PdfPageFormat,
  PdfOptions,
  IPdfGenerator,
} from './pdf.interface';
export { PDF_GENERATOR } from './pdf.interface';

// No-Op Implementation
export { NoOpPdfGenerator } from './no-op-pdf.generator';

// Service
export { PdfService } from './pdf.service';

// Module
export { PdfModule } from './pdf.module';
