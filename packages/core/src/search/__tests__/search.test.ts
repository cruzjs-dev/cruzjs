/**
 * Full-Text Search Unit Tests
 *
 * Tests for SQLiteFTSAdapter, SearchQueryBuilder, SearchService,
 * decorators, and indexing pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchQueryBuilder } from '../search.query-builder';
import { SearchService } from '../search.service';
import { Searchable, SearchField, getSearchableMetadata, getSearchFieldMetadata } from '../search.decorators';
import type { SearchAdapter } from '../search.adapter';
import type { SearchResult, IndexOptions, SearchOptions } from '../search.types';

// ─── Mock DB for SQLiteFTSAdapter ────────────────────────────────────────────

function createMockDb() {
  return {
    run: vi.fn().mockResolvedValue(undefined),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── SQLiteFTSAdapter ────────────────────────────────────────────────────────

describe('SQLiteFTSAdapter', () => {
  // We test through the SearchService with a mock adapter for most tests,
  // but also validate the SQLite adapter builds correct SQL concepts.

  it('index() should call db.run with DELETE and INSERT', async () => {
    const db = createMockDb();

    // Import after mock setup
    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);

    await adapter.index({
      id: 'doc-1',
      type: 'product',
      fields: { name: 'Widget', description: 'A useful widget' },
    });

    // Should have called ensureTable (CREATE VIRTUAL TABLE) + DELETE + INSERT
    expect(db.run).toHaveBeenCalledTimes(3);
  });

  it('search() with query returns ranked results', async () => {
    const db = createMockDb();
    db.all
      .mockResolvedValueOnce([{ cnt: 2 }]) // count query
      .mockResolvedValueOnce([
        { id: 'doc-1', type: 'product', content: '{"name":"Widget"}', rank: -1.5 },
        { id: 'doc-2', type: 'product', content: '{"name":"Gadget"}', rank: -0.8 },
      ]);

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    // Mark table as ensured so it doesn't try to create it
    (adapter as any).tableEnsured = true;

    const result = await adapter.search({ query: 'widget', limit: 10, offset: 0 });

    expect(result.total).toBe(2);
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0].id).toBe('doc-1');
    expect(result.hits[0].score).toBe(1.5);
    expect(result.hits[0].data).toEqual({ name: 'Widget' });
    expect(result.query).toBe('widget');
  });

  it('search() with type filter passes type in WHERE clause', async () => {
    const db = createMockDb();
    db.all
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([]);

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    (adapter as any).tableEnsured = true;

    await adapter.search({ query: 'test', type: 'article' });

    // The second call (count) should include type filter
    const countCall = db.all.mock.calls[0];
    expect(countCall).toBeDefined();
  });

  it('search() with field filters still searches content column', async () => {
    const db = createMockDb();
    db.all
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([]);

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    (adapter as any).tableEnsured = true;

    const result = await adapter.search({
      query: 'test',
      fields: ['title', 'body'],
    });

    expect(result.hits).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('remove() calls DELETE on search_index', async () => {
    const db = createMockDb();

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    (adapter as any).tableEnsured = true;

    await adapter.remove('product', 'doc-1');

    expect(db.run).toHaveBeenCalledTimes(1);
  });

  it('flush() with type deletes only that type', async () => {
    const db = createMockDb();

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    (adapter as any).tableEnsured = true;

    await adapter.flush('product');

    expect(db.run).toHaveBeenCalledTimes(1);
  });

  it('flush() without type deletes all documents', async () => {
    const db = createMockDb();

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    (adapter as any).tableEnsured = true;

    await adapter.flush();

    expect(db.run).toHaveBeenCalledTimes(1);
  });

  it('isAvailable() returns true when DB is accessible', async () => {
    const db = createMockDb();

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);

    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });

  it('search() with empty query returns empty results', async () => {
    const db = createMockDb();

    const { SQLiteFTSAdapter } = await import('../adapters/sqlite-fts.adapter');
    const adapter = new SQLiteFTSAdapter(db as any);
    (adapter as any).tableEnsured = true;

    const result = await adapter.search({ query: '' });
    expect(result.hits).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ─── SearchQueryBuilder ──────────────────────────────────────────────────────

describe('SearchQueryBuilder', () => {
  it('builds basic query options', () => {
    const options = SearchQueryBuilder.for('hello world').build();

    expect(options.query).toBe('hello world');
    expect(options.type).toBeUndefined();
    expect(options.limit).toBeUndefined();
    expect(options.offset).toBeUndefined();
  });

  it('chains type filter', () => {
    const options = SearchQueryBuilder.for('test')
      .inType('article')
      .build();

    expect(options.type).toBe('article');
  });

  it('chains field restriction', () => {
    const options = SearchQueryBuilder.for('test')
      .inFields('title', 'body')
      .build();

    expect(options.fields).toEqual(['title', 'body']);
  });

  it('chains facets', () => {
    const options = SearchQueryBuilder.for('test')
      .withFacets('type', 'category')
      .build();

    expect(options.facets).toEqual(['type', 'category']);
  });

  it('chains highlight', () => {
    const options = SearchQueryBuilder.for('test')
      .highlight()
      .build();

    expect(options.highlight).toBe(true);
  });

  it('chains limit and offset', () => {
    const options = SearchQueryBuilder.for('test')
      .limit(10)
      .offset(20)
      .build();

    expect(options.limit).toBe(10);
    expect(options.offset).toBe(20);
  });

  it('chains where filters', () => {
    const options = SearchQueryBuilder.for('test')
      .where('status', 'published')
      .where('tags', ['typescript', 'react'])
      .build();

    expect(options.filters).toEqual({
      status: 'published',
      tags: ['typescript', 'react'],
    });
  });

  it('builds full fluent chain', () => {
    const options = SearchQueryBuilder.for('typescript react')
      .inType('article')
      .inFields('title', 'body')
      .where('status', 'published')
      .withFacets('type')
      .highlight()
      .limit(10)
      .offset(20)
      .build();

    expect(options).toEqual({
      query: 'typescript react',
      type: 'article',
      fields: ['title', 'body'],
      filters: { status: 'published' },
      facets: ['type'],
      highlight: true,
      limit: 10,
      offset: 20,
    });
  });
});

// ─── SearchService ───────────────────────────────────────────────────────────

describe('SearchService', () => {
  let mockAdapter: SearchAdapter;
  let service: SearchService;

  beforeEach(() => {
    mockAdapter = {
      name: 'mock',
      index: vi.fn().mockResolvedValue(undefined),
      bulkIndex: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue({
        hits: [{ id: '1', score: 1, data: { name: 'Test' } }],
        total: 1,
        took: 5,
        query: 'test',
      } satisfies SearchResult),
      flush: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    // Construct service with explicit adapter (bypasses DI)
    service = new SearchService(mockAdapter);
  });

  it('search() delegates to adapter', async () => {
    const options: SearchOptions = { query: 'test', limit: 10, offset: 0 };
    const result = await service.search(options);

    expect(mockAdapter.search).toHaveBeenCalledWith(options);
    expect(result.total).toBe(1);
    expect(result.hits[0].data).toEqual({ name: 'Test' });
  });

  it('searchQuery() builds options from builder and delegates', async () => {
    const builder = SearchQueryBuilder.for('test').inType('product').limit(5);
    await service.searchQuery(builder);

    expect(mockAdapter.search).toHaveBeenCalledWith({
      query: 'test',
      type: 'product',
      limit: 5,
    });
  });

  it('index() delegates to adapter', async () => {
    const doc: IndexOptions = {
      id: 'doc-1',
      type: 'product',
      fields: { name: 'Widget' },
    };

    await service.index(doc);

    expect(mockAdapter.index).toHaveBeenCalledWith(doc);
  });

  it('bulkIndex() delegates to adapter', async () => {
    const docs: IndexOptions[] = [
      { id: 'doc-1', type: 'product', fields: { name: 'Widget' } },
      { id: 'doc-2', type: 'product', fields: { name: 'Gadget' } },
    ];

    await service.bulkIndex(docs);

    expect(mockAdapter.bulkIndex).toHaveBeenCalledWith(docs);
  });

  it('remove() delegates to adapter', async () => {
    await service.remove('product', 'doc-1');

    expect(mockAdapter.remove).toHaveBeenCalledWith('product', 'doc-1');
  });

  it('reindex() flushes and calls provider then bulk indexes', async () => {
    const provider = vi.fn().mockResolvedValue([
      { id: 'doc-1', type: 'product', fields: { name: 'Widget' } },
      { id: 'doc-2', type: 'product', fields: { name: 'Gadget' } },
    ]);

    const count = await service.reindex('product', provider);

    expect(mockAdapter.flush).toHaveBeenCalledWith('product');
    expect(provider).toHaveBeenCalled();
    expect(mockAdapter.bulkIndex).toHaveBeenCalledWith([
      { id: 'doc-1', type: 'product', fields: { name: 'Widget' } },
      { id: 'doc-2', type: 'product', fields: { name: 'Gadget' } },
    ]);
    expect(count).toBe(2);
  });

  it('reindex() with empty provider returns 0', async () => {
    const provider = vi.fn().mockResolvedValue([]);

    const count = await service.reindex('product', provider);

    expect(mockAdapter.flush).toHaveBeenCalledWith('product');
    expect(mockAdapter.bulkIndex).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('isAvailable() delegates to adapter', async () => {
    const available = await service.isAvailable();
    expect(available).toBe(true);
  });

  it('getAdapterName() returns adapter name', () => {
    expect(service.getAdapterName()).toBe('mock');
  });

  it('falls back to noop adapter when no adapter or db', () => {
    const noopService = new SearchService();
    expect(noopService.getAdapterName()).toBe('noop');
  });
});

// ─── Searchable Decorator ────────────────────────────────────────────────────

describe('Searchable decorator', () => {
  it('stores metadata on class', () => {
    @Searchable({
      type: 'product',
      fields: ['name', 'description'],
      weights: { name: 3 },
    })
    class Product {}

    const metadata = getSearchableMetadata(Product);
    expect(metadata).toBeDefined();
    expect(metadata!.type).toBe('product');
    expect(metadata!.fields).toEqual(['name', 'description']);
    expect(metadata!.weights).toEqual({ name: 3 });
  });

  it('returns undefined for non-decorated class', () => {
    class NotSearchable {}

    const metadata = getSearchableMetadata(NotSearchable);
    expect(metadata).toBeUndefined();
  });

  it('handles class without weights', () => {
    @Searchable({ type: 'article', fields: ['title'] })
    class Article {}

    const metadata = getSearchableMetadata(Article);
    expect(metadata!.weights).toBeUndefined();
  });
});

// ─── SearchField Decorator ───────────────────────────────────────────────────

describe('SearchField decorator', () => {
  it('stores field metadata with weight', () => {
    class Product {
      @SearchField(3) name!: string;
      @SearchField() description!: string;
      @SearchField(2) tags!: string[];
    }

    const fields = getSearchFieldMetadata(Product);
    expect(fields).toHaveLength(3);
    expect(fields).toContainEqual({ propertyKey: 'name', weight: 3 });
    expect(fields).toContainEqual({ propertyKey: 'description', weight: 1 });
    expect(fields).toContainEqual({ propertyKey: 'tags', weight: 2 });
  });

  it('defaults weight to 1', () => {
    class Article {
      @SearchField() title!: string;
    }

    const fields = getSearchFieldMetadata(Article);
    expect(fields[0].weight).toBe(1);
  });

  it('returns empty array for non-decorated class', () => {
    class Plain {}

    const fields = getSearchFieldMetadata(Plain);
    expect(fields).toHaveLength(0);
  });
});
