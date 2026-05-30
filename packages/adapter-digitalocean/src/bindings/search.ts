/**
 * DigitalOcean Search Adapter
 *
 * Delegates to SQLiteFTSAdapter as the default search backend.
 */

import type { SearchAdapter } from '@cruzjs/core/search';
import type { IndexOptions, SearchOptions, SearchResult } from '@cruzjs/core/search';
import { SQLiteFTSAdapter } from '@cruzjs/core/search';

export class DOSearchAdapter implements SearchAdapter {
  readonly name = 'digitalocean-search';

  private readonly fallback: SQLiteFTSAdapter | null;

  constructor(db?: unknown) {
    this.fallback = db ? new SQLiteFTSAdapter(db as any) : null;
  }

  async index(document: IndexOptions): Promise<void> {
    return this.fallback?.index(document);
  }

  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    return this.fallback?.bulkIndex(documents);
  }

  async remove(type: string, id: string): Promise<void> {
    return this.fallback?.remove(type, id);
  }

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    if (!this.fallback) {
      return { hits: [], total: 0, took: 0, query: options.query };
    }
    return this.fallback.search<T>(options);
  }

  async flush(type?: string): Promise<void> {
    return this.fallback?.flush(type);
  }

  async isAvailable(): Promise<boolean> {
    return this.fallback?.isAvailable() ?? false;
  }
}
