---
title: Full-Text Search
description: Full-text search with provider-agnostic adapters -- FTS5 on Cloudflare D1, OpenSearch or Elasticsearch on other platforms.
---

CruzJS provides full-text search through a provider-agnostic adapter interface. On Cloudflare, it uses SQLite FTS5 via D1 with zero additional configuration. Other platforms can use OpenSearch or Elasticsearch.

## Setup

Register the `SearchModule` in your application:

```typescript
import { SearchModule } from '@cruzjs/core/search';

export default createCruzApp({
  modules: [SearchModule],
});
```

## SearchAdapter Interface

All search backends implement the same interface:

```typescript
interface SearchAdapter {
  index(doc: SearchDocument): Promise<void>;
  bulkIndex(docs: SearchDocument[]): Promise<void>;
  remove(type: string, id: string): Promise<void>;
  search(options: SearchOptions): Promise<SearchResult>;
  flush(type?: string): Promise<void>;
}
```

## Platform Backends

| Platform | Adapter | Notes |
|----------|---------|-------|
| Cloudflare | `CloudflareFTSSearchAdapter` | Uses SQLite FTS5 via D1 -- built-in, no extra config |
| Docker / Containers | OpenSearch or Elasticsearch adapter | Requires `OPENSEARCH_URL` or `ELASTICSEARCH_URL` |

On Cloudflare, the FTS5 virtual table is created automatically alongside your D1 database. No external search service is needed.

## Indexing Documents

A `SearchDocument` has a type, ID, searchable content, and optional metadata:

```typescript
type SearchDocument = {
  type: string;
  id: string;
  content: string;
  metadata?: Record<string, string>;
};
```

### Index a Single Document

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { SearchAdapter, SEARCH_ADAPTER } from '@cruzjs/core/search';

@Injectable()
export class ArticleService {
  constructor(
    @Inject(SEARCH_ADAPTER) private readonly search: SearchAdapter,
  ) {}

  async createArticle(input: CreateArticleInput) {
    const article = await this.saveArticle(input);

    await this.search.index({
      type: 'article',
      id: article.id,
      content: `${article.title} ${article.body}`,
      metadata: {
        authorId: article.authorId,
        category: article.category,
      },
    });

    return article;
  }
}
```

### Bulk Index

```typescript
await this.search.bulkIndex(
  articles.map((article) => ({
    type: 'article',
    id: article.id,
    content: `${article.title} ${article.body}`,
    metadata: { category: article.category },
  })),
);
```

### Remove from Index

```typescript
await this.search.remove('article', articleId);
```

### Flush Index

Clear all documents, optionally filtered by type:

```typescript
await this.search.flush('article'); // Clear articles only
await this.search.flush();          // Clear everything
```

## Searching

### Search Options

```typescript
type SearchOptions = {
  query: string;
  type?: string;      // Filter by document type
  limit?: number;     // Max results (default: 20)
  offset?: number;    // Pagination offset
  highlight?: boolean; // Return highlighted snippets
};
```

### Search Result

```typescript
type SearchResult = {
  hits: Array<{
    id: string;
    type: string;
    score: number;
    snippet?: string;
    metadata?: Record<string, string>;
  }>;
  total: number;
  took: number;   // Query time in milliseconds
  query: string;
};
```

### Example: Search Articles

```typescript
const results = await this.search.search({
  query: 'typescript react',
  type: 'article',
  limit: 10,
  highlight: true,
});

// results.hits: [{ id: 'art_1', type: 'article', score: 2.5, snippet: '...TypeScript and <mark>React</mark>...' }]
// results.total: 42
// results.took: 12
```

## tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `search.query` | query | Full-text search with type filtering and pagination |
| `search.index` | mutation | Index a document |
| `search.remove` | mutation | Remove a document from the index |

### Client Usage

```typescript
function SearchPage() {
  const [query, setQuery] = useState('');
  const { data } = trpc.search.query.useQuery(
    { query, limit: 20 },
    { enabled: query.length > 2 },
  );

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {data?.hits.map((hit) => (
        <div key={hit.id}>
          <a href={`/${hit.type}s/${hit.id}`}>
            {hit.snippet ? (
              <span dangerouslySetInnerHTML={{ __html: hit.snippet }} />
            ) : (
              hit.id
            )}
          </a>
          <span>Score: {hit.score.toFixed(2)}</span>
        </div>
      ))}
      {data && <p>{data.total} results in {data.took}ms</p>}
    </div>
  );
}
```

## Index on Domain Events

A common pattern is to keep the search index in sync using domain events:

```typescript
import { Module } from '@cruzjs/core/di';
import { ArticleCreatedEvent, ArticleUpdatedEvent, ArticleDeletedEvent } from './events';
import { getAppContainer } from '@cruzjs/core';
import { SEARCH_ADAPTER, SearchAdapter } from '@cruzjs/core/search';

async function indexArticle(event: ArticleCreatedEvent | ArticleUpdatedEvent) {
  const container = await getAppContainer();
  const search = container.get<SearchAdapter>(SEARCH_ADAPTER);
  await search.index({
    type: 'article',
    id: event.articleId,
    content: `${event.title} ${event.body}`,
  });
}

async function removeArticle(event: ArticleDeletedEvent) {
  const container = await getAppContainer();
  const search = container.get<SearchAdapter>(SEARCH_ADAPTER);
  await search.remove('article', event.articleId);
}

@Module({
  events: [
    { event: ArticleCreatedEvent, listener: indexArticle },
    { event: ArticleUpdatedEvent, listener: indexArticle },
    { event: ArticleDeletedEvent, listener: removeArticle },
  ],
})
export class ArticleSearchModule {}
```
