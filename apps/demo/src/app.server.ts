/**
 * App Server
 *
 * Configures database schema and registers application modules.
 * Imported by entry.server.tsx before any request handling.
 */
import 'reflect-metadata';

import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import * as schema from '@/database/schema';

import { StartModule } from '@cruzjs/start/start.module';
import { Module } from '@cruzjs/core/di';
import { JOB_HANDLER } from '@cruzjs/core/jobs/job.module';
import { HelloWorldJobHandler } from '@/jobs/hello-world.handler';
import { chatbotsTrpc } from '@/trpc/chatbots.trpc';
import { pdfsTrpc } from '@/trpc/pdfs.trpc';
import { PdfService } from '@/server/pdf.service';

@Module({
  providers: [
    PdfService,
    { provide: JOB_HANDLER, useClass: HelloWorldJobHandler, multi: true },
  ],
  trpcRouters: {
    chatbots: chatbotsTrpc,
    pdfs: pdfsTrpc,
  },
})
class AppModule {}

DrizzleService.setSchema(schema);

registerModules([
  StartModule,
  AppModule,
]);

console.log('[Server] App server initialized');
