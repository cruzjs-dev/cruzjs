/**
 * PDF Module
 *
 * Registers the PdfService and NoOpPdfGenerator into the DI container.
 * Platform-specific adapters override the PDF_GENERATOR token
 * when a RuntimeAdapter provides one.
 */

import { Module } from '../di';
import { PdfService } from './pdf.service';
import { NoOpPdfGenerator } from './no-op-pdf.generator';
import { PDF_GENERATOR } from './pdf.interface';

@Module({
  providers: [
    PdfService,
    {
      provide: PDF_GENERATOR,
      useFactory: () => new NoOpPdfGenerator(),
    },
  ],
})
export class PdfModule {}
