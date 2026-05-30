/**
 * Azure Cognitive Search Adapter
 *
 * Delegates to SQLiteFTSAdapter by default. When Azure Cognitive Search
 * is configured via AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY env vars,
 * it can be extended to use the Azure Search REST API.
 */

import type { SearchAdapter } from '@cruzjs/core/search';
import type { IndexOptions, SearchOptions, SearchResult } from '@cruzjs/core/search';
import { SQLiteFTSAdapter } from '@cruzjs/core/search';

export class AzureCognitiveSearchAdapter implements SearchAdapter {
  readonly name = 'azure-cognitive-search';

  private readonly fallback: SQLiteFTSAdapter | null;

  constructor(
    private readonly searchEndpoint: string | null,
    private readonly searchKey: string | null,
    db?: unknown,
  ) {
    this.fallback = db ? new SQLiteFTSAdapter(db as any) : null;
  }

  async index(document: IndexOptions): Promise<void> {
    if (this.searchEndpoint && this.searchKey) {
      // TODO: POST /indexes/{index}/docs/index
    }
    return this.fallback?.index(document);
  }

  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    if (this.searchEndpoint && this.searchKey) {
      // TODO: Batch upload via Azure Search REST API
    }
    return this.fallback?.bulkIndex(documents);
  }

  async remove(type: string, id: string): Promise<void> {
    if (this.searchEndpoint && this.searchKey) {
      // TODO: Delete action in index batch
    }
    return this.fallback?.remove(type, id);
  }

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    if (this.searchEndpoint && this.searchKey) {
      // TODO: POST /indexes/{index}/docs/search
    }
    if (!this.fallback) {
      return { hits: [], total: 0, took: 0, query: options.query };
    }
    return this.fallback.search<T>(options);
  }

  async flush(type?: string): Promise<void> {
    if (this.searchEndpoint && this.searchKey) {
      // TODO: Delete and recreate index
    }
    return this.fallback?.flush(type);
  }

  async isAvailable(): Promise<boolean> {
    if (this.searchEndpoint && this.searchKey) {
      return true;
    }
    return this.fallback?.isAvailable() ?? false;
  }
}
