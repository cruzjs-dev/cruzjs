/**
 * Search Adapter Interface
 *
 * Provider-agnostic interface for full-text search backends.
 * Implementations may use SQLite FTS5, Meilisearch, OpenSearch,
 * Azure Cognitive Search, etc.
 */

import type { IndexOptions, SearchOptions, SearchResult } from './search.types';

export interface SearchAdapter {
  readonly name: string;

  /** Index a document */
  index(document: IndexOptions): Promise<void>;

  /** Bulk index documents */
  bulkIndex(documents: IndexOptions[]): Promise<void>;

  /** Remove document from index */
  remove(type: string, id: string): Promise<void>;

  /** Search */
  search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>>;

  /** Flush/clear the index */
  flush(type?: string): Promise<void>;

  /** Check if adapter is available */
  isAvailable(): Promise<boolean>;
}
