/**
 * Cloudflare FTS Search Adapter
 *
 * Wraps SQLiteFTSAdapter using D1, which supports FTS5 natively.
 * Falls back to no-op when D1 is not available (local dev without D1).
 */

import type { SearchAdapter } from '@cruzjs/core/search';
import type { IndexOptions, SearchOptions, SearchResult } from '@cruzjs/core/search';
import { SQLiteFTSAdapter } from '@cruzjs/core/search';

export class CloudflareFTSSearchAdapter implements SearchAdapter {
  readonly name = 'cloudflare-fts5';

  private readonly inner: SQLiteFTSAdapter | null;

  constructor(db: unknown) {
    if (db) {
      // D1 is SQLite — FTS5 is fully supported
      this.inner = new SQLiteFTSAdapter(db as any);
    } else {
      this.inner = null;
    }
  }

  async index(document: IndexOptions): Promise<void> {
    if (!this.inner) return;
    return this.inner.index(document);
  }

  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    if (!this.inner) return;
    return this.inner.bulkIndex(documents);
  }

  async remove(type: string, id: string): Promise<void> {
    if (!this.inner) return;
    return this.inner.remove(type, id);
  }

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    if (!this.inner) {
      return { hits: [], total: 0, took: 0, query: options.query };
    }
    return this.inner.search<T>(options);
  }

  async flush(type?: string): Promise<void> {
    if (!this.inner) return;
    return this.inner.flush(type);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.inner) return false;
    return this.inner.isAvailable();
  }
}
