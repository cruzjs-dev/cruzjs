/**
 * Docker Search Adapter
 *
 * Delegates to SQLiteFTSAdapter by default.
 * Checks for MEILISEARCH_URL env var and uses Meilisearch if available.
 */

import type { SearchAdapter } from '@cruzjs/core/search';
import type { IndexOptions, SearchOptions, SearchResult } from '@cruzjs/core/search';
import { SQLiteFTSAdapter } from '@cruzjs/core/search';

export class DockerSearchAdapter implements SearchAdapter {
  readonly name: string;

  private readonly fallback: SQLiteFTSAdapter | null;
  private readonly meilisearchUrl: string | null;
  private readonly meilisearchKey: string | null;

  constructor(meilisearchUrl: string | null, db?: unknown) {
    this.meilisearchUrl = meilisearchUrl;
    this.meilisearchKey = process.env.MEILISEARCH_KEY || null;
    this.fallback = db ? new SQLiteFTSAdapter(db as any) : null;
    this.name = meilisearchUrl ? 'docker-meilisearch' : 'docker-sqlite-fts5';
  }

  async index(document: IndexOptions): Promise<void> {
    if (this.meilisearchUrl) {
      // TODO: PUT /indexes/{type}/documents
      // await fetch(`${this.meilisearchUrl}/indexes/${document.type}/documents`, {
      //   method: 'PUT',
      //   headers: this.meilisearchHeaders(),
      //   body: JSON.stringify([{ id: document.id, ...document.fields }]),
      // });
      return;
    }
    return this.fallback?.index(document);
  }

  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    if (this.meilisearchUrl) {
      // TODO: Batch upload to Meilisearch
      return;
    }
    return this.fallback?.bulkIndex(documents);
  }

  async remove(type: string, id: string): Promise<void> {
    if (this.meilisearchUrl) {
      // TODO: DELETE /indexes/{type}/documents/{id}
      return;
    }
    return this.fallback?.remove(type, id);
  }

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    if (this.meilisearchUrl) {
      // TODO: POST /indexes/{type}/search
      // Use Meilisearch REST API
    }
    if (!this.fallback) {
      return { hits: [], total: 0, took: 0, query: options.query };
    }
    return this.fallback.search<T>(options);
  }

  async flush(type?: string): Promise<void> {
    if (this.meilisearchUrl) {
      // TODO: DELETE /indexes/{type}/documents
      return;
    }
    return this.fallback?.flush(type);
  }

  async isAvailable(): Promise<boolean> {
    if (this.meilisearchUrl) {
      try {
        const res = await fetch(`${this.meilisearchUrl}/health`);
        return res.ok;
      } catch {
        return false;
      }
    }
    return this.fallback?.isAvailable() ?? false;
  }

  private meilisearchHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.meilisearchKey) {
      headers.Authorization = `Bearer ${this.meilisearchKey}`;
    }
    return headers;
  }
}
