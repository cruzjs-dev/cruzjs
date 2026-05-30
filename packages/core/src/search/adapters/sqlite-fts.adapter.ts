/**
 * SQLite FTS5 Search Adapter
 *
 * Default full-text search adapter using SQLite FTS5 virtual tables.
 * Works with D1 (Cloudflare), libsql, and any SQLite-compatible database.
 *
 * Uses porter tokenizer for stemming and ASCII folding for diacritics.
 * Documents are stored as JSON in the content column.
 */

import { Injectable, Inject } from '../../di';
import { DRIZZLE, type DrizzleDatabase } from '../../shared/database/drizzle.service';
import type { SearchAdapter } from '../search.adapter';
import type { IndexOptions, SearchOptions, SearchResult, SearchHit, SearchFacet } from '../search.types';
import { sql } from 'drizzle-orm';

const SEARCH_TABLE = 'search_index';

@Injectable()
export class SQLiteFTSAdapter implements SearchAdapter {
  readonly name = 'sqlite-fts5';

  private tableEnsured = false;

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Creates the FTS5 virtual table if it does not already exist.
   * Called lazily on first operation.
   */
  async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;

    await this.db.run(
      sql.raw(
        `CREATE VIRTUAL TABLE IF NOT EXISTS ${SEARCH_TABLE} USING fts5(id UNINDEXED, type UNINDEXED, content, tokenize='porter ascii')`,
      ),
    );
    this.tableEnsured = true;
  }

  async index(document: IndexOptions): Promise<void> {
    await this.ensureTable();

    const content = this.buildContent(document);

    // Delete existing entry first (FTS5 does not support INSERT OR REPLACE directly)
    await this.db.run(
      sql`DELETE FROM ${sql.raw(SEARCH_TABLE)} WHERE id = ${document.id} AND type = ${document.type}`,
    );
    await this.db.run(
      sql`INSERT INTO ${sql.raw(SEARCH_TABLE)}(id, type, content) VALUES (${document.id}, ${document.type}, ${content})`,
    );
  }

  async bulkIndex(documents: IndexOptions[]): Promise<void> {
    await this.ensureTable();

    // Process in batches to avoid hitting SQLite limits
    for (const doc of documents) {
      await this.index(doc);
    }
  }

  async remove(type: string, id: string): Promise<void> {
    await this.ensureTable();

    await this.db.run(
      sql`DELETE FROM ${sql.raw(SEARCH_TABLE)} WHERE id = ${id} AND type = ${type}`,
    );
  }

  async search<T = Record<string, unknown>>(options: SearchOptions): Promise<SearchResult<T>> {
    await this.ensureTable();

    const startTime = Date.now();
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    // Sanitize the query for FTS5 (escape special characters)
    const sanitizedQuery = this.sanitizeQuery(options.query);

    if (!sanitizedQuery) {
      return { hits: [], total: 0, took: Date.now() - startTime, query: options.query };
    }

    // Build the MATCH expression
    let matchExpr = sanitizedQuery;

    // If specific fields are requested, prefix the query
    if (options.fields && options.fields.length > 0) {
      // FTS5 does not support per-column search on a single 'content' column,
      // so we search the whole content column regardless
      matchExpr = sanitizedQuery;
    }

    // Build the WHERE clause
    const conditions: ReturnType<typeof sql>[] = [
      sql`${sql.raw(SEARCH_TABLE)} MATCH ${matchExpr}`,
    ];

    if (options.type) {
      conditions.push(sql`type = ${options.type}`);
    }

    const whereClause = conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} AND ${cond}`,
    );

    // Get total count
    const countResult = await this.db.all<{ cnt: number }>(
      sql`SELECT COUNT(*) as cnt FROM ${sql.raw(SEARCH_TABLE)} WHERE ${whereClause}`,
    );
    const total = countResult[0]?.cnt ?? 0;

    // Get results with ranking
    let rows: Array<{ id: string; type: string; content: string; rank: number }>;

    if (options.highlight) {
      rows = await this.db.all<{ id: string; type: string; content: string; rank: number }>(
        sql`SELECT id, type, snippet(${sql.raw(SEARCH_TABLE)}, 2, '<mark>', '</mark>', '...', 64) as content, rank FROM ${sql.raw(SEARCH_TABLE)} WHERE ${whereClause} ORDER BY rank LIMIT ${limit} OFFSET ${offset}`,
      );
    } else {
      rows = await this.db.all<{ id: string; type: string; content: string; rank: number }>(
        sql`SELECT id, type, content, rank FROM ${sql.raw(SEARCH_TABLE)} WHERE ${whereClause} ORDER BY rank LIMIT ${limit} OFFSET ${offset}`,
      );
    }

    // Parse results
    const hits: SearchHit<T>[] = rows.map((row) => {
      let data: T;
      try {
        data = JSON.parse(row.content) as T;
      } catch {
        data = { content: row.content } as unknown as T;
      }

      const hit: SearchHit<T> = {
        id: row.id,
        score: Math.abs(row.rank), // FTS5 rank is negative (lower is better)
        data,
      };

      if (options.highlight) {
        hit.highlights = { content: [row.content] };
      }

      return hit;
    });

    // Build facets if requested
    let facets: SearchFacet[] | undefined;
    if (options.facets && options.facets.length > 0) {
      facets = await this.buildFacets(options.facets, whereClause);
    }

    return {
      hits,
      total,
      took: Date.now() - startTime,
      facets,
      query: options.query,
    };
  }

  async flush(type?: string): Promise<void> {
    await this.ensureTable();

    if (type) {
      await this.db.run(
        sql`DELETE FROM ${sql.raw(SEARCH_TABLE)} WHERE type = ${type}`,
      );
    } else {
      await this.db.run(
        sql`DELETE FROM ${sql.raw(SEARCH_TABLE)}`,
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureTable();
      return true;
    } catch {
      return false;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  /**
   * Build searchable content string from document fields.
   * Applies weight by repeating high-weight field values.
   */
  private buildContent(document: IndexOptions): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(document.fields)) {
      if (value == null) continue;

      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const weight = document.weight?.[key] ?? 1;

      // Repeat the value based on weight to boost relevance
      for (let i = 0; i < Math.max(1, Math.round(weight)); i++) {
        parts.push(stringValue);
      }
    }

    return parts.join(' ');
  }

  /**
   * Sanitize query for FTS5 MATCH syntax.
   * Removes special FTS5 operators that could cause syntax errors.
   */
  private sanitizeQuery(query: string): string {
    // Remove FTS5 special characters and operators
    return query
      .replace(/[*:^~"(){}[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Build facet counts from a secondary query.
   * Since FTS5 stores everything in a single content column,
   * we facet on the 'type' column (the only structured column).
   */
  private async buildFacets(
    facetFields: string[],
    _whereClause: ReturnType<typeof sql>,
  ): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];

    // We can only facet on the 'type' column in FTS5
    if (facetFields.includes('type')) {
      const typeResults = await this.db.all<{ type: string; cnt: number }>(
        sql`SELECT type, COUNT(*) as cnt FROM ${sql.raw(SEARCH_TABLE)} GROUP BY type ORDER BY cnt DESC`,
      );

      facets.push({
        field: 'type',
        values: typeResults.map((r) => ({ value: r.type, count: r.cnt })),
      });
    }

    return facets;
  }
}
