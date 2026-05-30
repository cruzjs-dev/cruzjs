/**
 * tRPC App Router
 *
 * Composes router maps from core, pro, and start packages
 * into the final AppRouter type.
 */
import { router } from '@cruzjs/core/trpc/context';
import { registerCruzCoreTrpcRouters } from '@cruzjs/core/trpc/routers';
import { registerCruzSaasTrpcRouters } from '@cruzjs/saas/trpc/routers';
import { registerCruzStartTrpcRouters } from '@cruzjs/start/trpc/routers';
import { chatbotsTrpc } from './chatbots.trpc';
import { pdfsTrpc } from './pdfs.trpc';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  ...registerCruzSaasTrpcRouters(),
  ...registerCruzStartTrpcRouters(),
  chatbots: chatbotsTrpc,
  pdfs: pdfsTrpc,
});

export type AppRouter = typeof appRouter;
