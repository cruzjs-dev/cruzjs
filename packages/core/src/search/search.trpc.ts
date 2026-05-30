/**
 * Search tRPC Router
 *
 * Endpoints for full-text search and reindexing.
 * Uses protectedProcedure since search requires authentication.
 */

import { Inject } from '../di';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { protectedProcedure } from '../trpc/context';
import { SearchService } from './search.service';
import { searchOptionsSchema, reindexSchema } from './search.validation';

@Router()
export class SearchTrpc extends TrpcRouter {
  @Inject(SearchService) private service!: SearchService;

  /** Full-text search across indexed documents */
  @Route() search = protectedProcedure
    .input(searchOptionsSchema)
    .query(async ({ input }) => {
      return this.service.search(input);
    });

  /** Trigger reindexing for a specific entity type */
  @Route() reindex = protectedProcedure
    .input(reindexSchema)
    .mutation(async ({ input }) => {
      // Reindex with an empty provider — actual providers should be registered
      // via the SearchIndexingPipeline. This endpoint just flushes and returns 0
      // unless a custom reindex provider is configured.
      const indexed = await this.service.reindex(input.type, async () => []);
      return { indexed };
    });
}
