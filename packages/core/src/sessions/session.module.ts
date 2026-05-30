/**
 * Session Module
 *
 * Registers the SessionService, DatabaseSessionAdapter, and tRPC router.
 * The SESSION_ADAPTER token is optional -- when not provided, the service
 * falls back to the DatabaseSessionAdapter.
 */

import { Module } from '../di';
import { SessionService } from './session.service';
import { DatabaseSessionAdapter } from './adapters/database.session.adapter';
import { SessionTrpc } from './session.trpc';

@Module({
  providers: [SessionService, DatabaseSessionAdapter, SessionTrpc],
  trpcRouters: {
    session: SessionTrpc,
  },
})
export class SessionModule {}
