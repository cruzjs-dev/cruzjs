/**
 * Search Query Builder
 *
 * Fluent builder for constructing SearchOptions objects.
 *
 * @example
 * ```typescript
 * const options = SearchQueryBuilder
 *   .for('typescript react')
 *   .inType('article')
 *   .inFields('title', 'body')
 *   .withFacets('type', 'category')
 *   .highlight()
 *   .limit(10)
 *   .offset(20)
 *   .build();
 * ```
 */

import type { SearchOptions } from './search.types';

export class SearchQueryBuilder<T = Record<string, unknown>> {
  private readonly options: Partial<SearchOptions> = {};

  private constructor(query: string) {
    this.options.query = query;
  }

  /** Create a new query builder for the given search query */
  static for<T = Record<string, unknown>>(query: string): SearchQueryBuilder<T> {
    return new SearchQueryBuilder<T>(query);
  }

  /** Add a filter condition */
  where(field: string, value: string | string[]): this {
    if (!this.options.filters) {
      this.options.filters = {};
    }
    this.options.filters[field] = value;
    return this;
  }

  /** Filter results to a specific entity type */
  inType(type: string): this {
    this.options.type = type;
    return this;
  }

  /** Restrict search to specific fields */
  inFields(...fields: string[]): this {
    this.options.fields = fields;
    return this;
  }

  /** Request facet counts for the specified fields */
  withFacets(...fields: string[]): this {
    this.options.facets = fields;
    return this;
  }

  /** Enable match highlighting */
  highlight(): this {
    this.options.highlight = true;
    return this;
  }

  /** Set the maximum number of results */
  limit(n: number): this {
    this.options.limit = n;
    return this;
  }

  /** Set the result offset (for pagination) */
  offset(n: number): this {
    this.options.offset = n;
    return this;
  }

  /** Build the final SearchOptions object */
  build(): SearchOptions {
    if (!this.options.query) {
      throw new Error('Search query is required');
    }
    return this.options as SearchOptions;
  }
}
