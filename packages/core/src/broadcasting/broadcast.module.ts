/**
 * Broadcast Module
 *
 * Registers the BroadcastService, BroadcastAuthService, SSE backend, and tRPC router.
 * The BROADCAST_ADAPTER token is optional -- when not provided, the service
 * falls back to in-process SSE delivery.
 *
 * The SSE_BACKEND token defaults to the InMemorySSEBackend (push mode).
 * Adapters can override this binding with a poll-mode backend (KVSSEBackend,
 * DatabaseSSEBackend) for serverless environments.
 */

import { Module } from '../di';
import { BroadcastService } from './broadcast.service';
import { BroadcastAuthService } from './broadcast.middleware';
import { BroadcastTrpc } from './broadcast.trpc';
import { SSE_BACKEND, defaultSSEBackend } from './sse-backend';

@Module({
  providers: [
    BroadcastService,
    BroadcastAuthService,
    BroadcastTrpc,
    {
      provide: SSE_BACKEND,
      useValue: defaultSSEBackend,
    },
  ],
  trpcRouters: {
    broadcast: BroadcastTrpc,
  },
})
export class BroadcastModule {}
