/**
 * @cruzjs/core Full-Text Search
 *
 * Provider-agnostic full-text search with SQLite FTS5 default,
 * query builder, decorators, and automatic indexing pipeline.
 */

// Types
export type {
  SearchHit,
  SearchFacet,
  SearchResult,
  IndexedDocument,
  SearchOptions,
  IndexOptions,
} from './search.types';
export { SEARCH_ADAPTER } from './search.types';

// Adapter interface
export type { SearchAdapter } from './search.adapter';

// Default adapter
export { SQLiteFTSAdapter } from './adapters/sqlite-fts.adapter';

// Query builder
export { SearchQueryBuilder } from './search.query-builder';

// Decorators
export {
  Searchable,
  SearchField,
  getSearchableMetadata,
  getSearchFieldMetadata,
} from './search.decorators';
export type { SearchableMetadata, SearchFieldMetadata } from './search.decorators';

// Service
export { SearchService } from './search.service';

// Indexing pipeline
export { SearchIndexingPipeline } from './search.indexing-pipeline';
export type { IndexingHandler } from './search.indexing-pipeline';

// tRPC Router
export { SearchTrpc } from './search.trpc';

// Validation
export { searchOptionsSchema, reindexSchema } from './search.validation';
export type { SearchOptionsInput, ReindexInput } from './search.validation';

// Module
export { SearchModule } from './search.module';
