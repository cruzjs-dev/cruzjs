/**
 * Full-Text Search Types
 *
 * Core types for the CruzJS full-text search system.
 */

import { createToken } from '../di/tokens/create-token';
import type { SearchAdapter } from './search.adapter';

export interface SearchHit<T = Record<string, unknown>> {
  id: string;
  score: number;
  data: T;
  highlights?: Record<string, string[]>;
}

export interface SearchFacet {
  field: string;
  values: Array<{ value: string; count: number }>;
}

export interface SearchResult<T = Record<string, unknown>> {
  hits: SearchHit<T>[];
  total: number;
  took: number; // ms
  facets?: SearchFacet[];
  query: string;
}

export interface IndexedDocument {
  id: string;
  type: string; // entity type (e.g., 'user', 'product')
  fields: Record<string, unknown>;
  indexedAt: Date;
}

export interface SearchOptions {
  query: string;
  type?: string; // filter by entity type
  fields?: string[]; // which fields to search (default: all)
  filters?: Record<string, string | string[]>;
  facets?: string[]; // fields to facet on
  highlight?: boolean; // wrap matches in <mark> tags
  limit?: number;
  offset?: number;
}

export interface IndexOptions {
  id: string;
  type: string;
  fields: Record<string, unknown>;
  weight?: Record<string, number>; // field boost weights
}

/** DI token for injecting a platform-specific SearchAdapter */
export const SEARCH_ADAPTER = createToken<SearchAdapter>('SEARCH_ADAPTER');
