/**
 * AWS OpenSearch Adapter
 *
 * Delegates to SQLiteFTSAdapter by default. When an OpenSearch endpoint
 * is configured via OPENSEARCH_ENDPOINT env var, it can be extended
 * to use the OpenSearch API.
 */

import type { SearchAdapter } from '@cruzjs/core/search';
import type { IndexOptions, SearchOptions, SearchResult } from '@cruzjs/core/search';
import { SQLiteFTSAdapter } from '@cruzjs/core/search';

export class AWSOpenSearchAdapter implements SearchAdapter {
  readonly name = 'aws-opensearch';

  private readonly fallback: SQLiteFTSAdapter | null;

  constructor(private readonly openSearchEndpoint: string | null, db?: unknown) {
    // Use SQLiteFTSAdapter as fallback when OpenSearch is not configured
    this.fallback = db ? new SQLiteFTSAdapter(db as any) : null;
  }

  async index(document: IndexOptions): Promise<void> {
    if (this.openSearchEndpoint) {
      // TODO: Implement OpenSearch indexing via REST API
      // POST /{index}/_doc/{id}
    }
    return this.fallback?.index(document);
  }

  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    if (this.openSearchEndpoint) {
      // TODO: Implement OpenSearch bulk indexing
      // POST /_bulk
    }
    return this.fallback?.bulkIndex(documents);
  }

  async remove(type: string, id: string): Promise<void> {
    if (this.openSearchEndpoint) {
      // TODO: DELETE /{index}/_doc/{id}
    }
    return this.fallback?.remove(type, id);
  }

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    if (this.openSearchEndpoint) {
      // TODO: Implement OpenSearch query DSL
      // POST /{index}/_search
    }
    if (!this.fallback) {
      return { hits: [], total: 0, took: 0, query: options.query };
    }
    return this.fallback.search<T>(options);
  }

  async flush(type?: string): Promise<void> {
    if (this.openSearchEndpoint) {
      // TODO: DELETE /{index}
    }
    return this.fallback?.flush(type);
  }

  async isAvailable(): Promise<boolean> {
    if (this.openSearchEndpoint) {
      // TODO: Check OpenSearch cluster health
      return true;
    }
    return this.fallback?.isAvailable() ?? false;
  }
}
