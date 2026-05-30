import { Module } from '@cruzjs/core/di';
import { AiConnectionsService } from './ai-connections.service';
import { aiConnectionsTrpc } from './ai-connections.trpc';

/**
 * AI Connections Module
 *
 * Registers AiConnectionsService and the aiConnections tRPC router.
 */
@Module({
  providers: [AiConnectionsService],
  trpcRouters: {
    aiConnections: aiConnectionsTrpc,
  },
})
export class AiConnectionsModule {}
