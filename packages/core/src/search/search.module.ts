/**
 * Search Module
 *
 * Registers the SearchService, SQLiteFTSAdapter, SearchIndexingPipeline,
 * and tRPC router into the DI container.
 *
 * Platform-specific adapters override the SEARCH_ADAPTER token
 * when a RuntimeAdapter provides one.
 */

import { Module } from '../di';
import { SearchService } from './search.service';
import { SQLiteFTSAdapter } from './adapters/sqlite-fts.adapter';
import { SearchIndexingPipeline } from './search.indexing-pipeline';
import { SearchTrpc } from './search.trpc';

@Module({
  providers: [SearchService, SQLiteFTSAdapter, SearchIndexingPipeline, SearchTrpc],
  trpcRouters: {
    search: SearchTrpc,
  },
})
export class SearchModule {}
