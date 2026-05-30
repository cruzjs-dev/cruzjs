/**
 * Magic Link Module
 *
 * Registers the MagicLinkService and tRPC router into the DI container.
 * Register via `createCruzApp({ modules: [MagicLinkModule] })`.
 */

import { Module } from '../di';
import { MagicLinkService } from './magic-link.service';
import { MagicLinkTrpc } from './magic-link.trpc';

@Module({
  providers: [MagicLinkService, MagicLinkTrpc],
  trpcRouters: {
    magicLink: MagicLinkTrpc,
  },
})
export class MagicLinkModule {}
