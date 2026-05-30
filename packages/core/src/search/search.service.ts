/**
 * Search Service
 *
 * Central service for full-text search operations.
 * Delegates to the underlying SearchAdapter for storage/retrieval.
 * Falls back to SQLiteFTSAdapter if no platform-specific adapter is injected.
 */

import { Injectable, Inject, Optional } from '../di';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import type { SearchAdapter } from './search.adapter';
import type { IndexOptions, SearchOptions, SearchResult } from './search.types';
import { SEARCH_ADAPTER } from './search.types';
import type { SearchQueryBuilder } from './search.query-builder';
import { SQLiteFTSAdapter } from './adapters/sqlite-fts.adapter';

@Injectable()
export class SearchService {
  private readonly adapter: SearchAdapter;

  constructor(
    @Inject(SEARCH_ADAPTER) @Optional() adapter?: SearchAdapter,
    @Inject(DRIZZLE) @Optional() db?: DrizzleDatabase,
  ) {
    if (adapter) {
      this.adapter = adapter;
    } else if (db) {
      // Fall back to SQLiteFTSAdapter when no platform adapter is provided
      this.adapter = new SQLiteFTSAdapter(db);
    } else {
      // Provide a no-op adapter as last resort
      this.adapter = new NoOpSearchAdapter();
    }
  }

  /** Search with SearchOptions */
  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    return this.adapter.search<T>(options);
  }

  /** Search using a SearchQueryBuilder */
  async searchQuery<T = Record<string, unknown>>(builder: SearchQueryBuilder<T>): Promise<SearchResult<T>> {
    return this.adapter.search<T>(builder.build());
  }

  /** Index a single document */
  async index(document: IndexOptions): Promise<void> {
    return this.adapter.index(document);
  }

  /** Bulk index multiple documents */
  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    return this.adapter.bulkIndex(documents);
  }

  /** Remove a document from the index */
  async remove(type: string, id: string): Promise<void> {
    return this.adapter.remove(type, id);
  }

  /**
   * Re-index all documents of a type.
   * The provider callback supplies the documents to index.
   * Returns the number of documents indexed.
   */
  async reindex(type: string, provider: () => Promise<IndexOptions[]>): Promise<number> {
    // Flush existing documents of this type
    await this.adapter.flush(type);

    // Get fresh documents from the provider
    const documents = await provider();

    if (documents.length > 0) {
      await this.adapter.bulkIndex(documents);
    }

    return documents.length;
  }

  /** Flush the index (optionally for a specific type) */
  async flush(type?: string): Promise<void> {
    return this.adapter.flush(type);
  }

  /** Check if the search backend is available */
  async isAvailable(): Promise<boolean> {
    return this.adapter.isAvailable();
  }

  /** Get the underlying adapter name */
  getAdapterName(): string {
    return this.adapter.name;
  }
}

/**
 * No-op adapter used when neither a platform adapter nor a database is available.
 * Returns empty results for all operations.
 */
class NoOpSearchAdapter implements SearchAdapter {
  readonly name = 'noop';

  async index(_document: IndexOptions): Promise<void> {}
  async bulkIndex(_documents: IndexOptions[]): Promise<void> {}
  async remove(_type: string, _id: string): Promise<void> {}

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    return { hits: [], total: 0, took: 0, query: options.query };
  }

  async flush(_type?: string): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return false;
  }
}
