import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Resource } from '../resource';
import { ResourceCollection } from '../resource-collection';
import { buildPaginationMeta, paginate } from '../pagination';
import { Field, Computed, Hidden, When, Include } from '../resource.decorators';
import { ResourceTransformer } from '../resource.transformer';
import type { SerializationContext } from '../resource.types';

// ---------------------------------------------------------------------------
// Test fixtures — Manual transform() mode
// ---------------------------------------------------------------------------

type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  org?: { id: string; name: string } | null;
  profile?: { bio: string } | null;
};

type UserOutput = {
  id: string;
  name: string;
  email: string;
  orgName?: string;
  profile?: { bio: string };
};

class UserResource extends Resource<User, UserOutput> {
  transform(): UserOutput {
    return {
      id: this.model.id,
      name: this.model.name,
      email: this.model.email,
      orgName: this.whenLoaded(this.model.org, (org) => org.name) as
        | string
        | undefined,
      profile: this.whenLoaded(this.model.profile) as
        | { bio: string }
        | undefined,
    };
  }
}

type Org = { id: string; name: string };
type OrgOutput = { id: string; name: string };

class OrgResource extends Resource<Org, OrgOutput> {
  transform(): OrgOutput {
    return { id: this.model.id, name: this.model.name };
  }
}

type Post = {
  id: string;
  title: string;
  published: boolean;
  author: User | null;
};

type PostOutput = {
  id: string;
  title: string;
  slug?: string;
  author?: UserOutput;
};

class PostResource extends Resource<Post, PostOutput> {
  transform(): PostOutput {
    return {
      id: this.model.id,
      title: this.model.title,
      slug: this.when(this.model.published, () =>
        this.model.title.toLowerCase().replace(/\s+/g, '-'),
      ),
      author: this.resource(UserResource, this.model.author),
    };
  }
}

// ---------------------------------------------------------------------------
// Test fixtures — Decorator-driven mode
// ---------------------------------------------------------------------------

type Article = {
  id: string;
  title: string;
  body: string;
  internalNotes: string;
  published: boolean;
  author: { id: string; name: string } | null;
  tags: { id: string; label: string }[] | null;
};

class TagResource extends Resource<{ id: string; label: string }, { id: string; label: string }> {
  @Field() id!: string;
  @Field() label!: string;

  transform() {
    return { id: this.model.id, label: this.model.label };
  }
}

class AuthorResource extends Resource<{ id: string; name: string }, { id: string; name: string }> {
  @Field() id!: string;
  @Field() name!: string;

  transform() {
    return { id: this.model.id, name: this.model.name };
  }
}

class ArticleResource extends Resource<Article> {
  @Field() id!: string;
  @Field({ name: 'headline' }) title!: string;
  @Field() body!: string;
  @Hidden() internalNotes!: string;
  @When((ctx) => ctx.user?.role === 'admin') published!: boolean;
  @Computed() get slug() {
    return this.model.title.toLowerCase().replace(/\s+/g, '-');
  }
  @Include({ relation: 'author', resource: AuthorResource }) author!: any;
  @Include({ relation: 'tags', resource: TagResource, lazy: true }) tags!: any;

  transform(): Record<string, unknown> {
    // Manual fallback — should not be used when decorators are present
    return { id: this.model.id };
  }
}

// ---------------------------------------------------------------------------
// Tests — Manual transform()
// ---------------------------------------------------------------------------

describe('Resource', () => {
  const sampleUser: User = {
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'secret-hash',
    org: { id: 'o1', name: 'Acme' },
    profile: { bio: 'Hello world' },
  };

  it('transforms a model into the correct output shape', () => {
    const result = new UserResource(sampleUser).transform();

    expect(result).toEqual({
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      orgName: 'Acme',
      profile: { bio: 'Hello world' },
    });
    // Internal field must not leak
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('static from() produces the same output', () => {
    const result = UserResource.from(sampleUser);

    expect(result).toEqual({
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      orgName: 'Acme',
      profile: { bio: 'Hello world' },
    });
  });

  describe('when()', () => {
    it('includes the value when condition is true', () => {
      const post: Post = {
        id: 'p1',
        title: 'Hello World',
        published: true,
        author: null,
      };
      const result = new PostResource(post).transform();

      expect(result.slug).toBe('hello-world');
    });

    it('returns undefined when condition is false', () => {
      const post: Post = {
        id: 'p1',
        title: 'Hello World',
        published: false,
        author: null,
      };
      const result = new PostResource(post).transform();

      expect(result.slug).toBeUndefined();
    });

    it('accepts a raw value instead of a callback', () => {
      const resource = new (class extends Resource<
        { flag: boolean },
        { val?: string }
      > {
        transform() {
          return { val: this.when(this.model.flag, 'yes') };
        }
      })({ flag: true });

      expect(resource.transform().val).toBe('yes');
    });
  });

  describe('whenLoaded()', () => {
    it('returns undefined for null relations', () => {
      const user: User = { ...sampleUser, org: null };
      const result = new UserResource(user).transform();

      expect(result.orgName).toBeUndefined();
    });

    it('returns undefined for undefined relations', () => {
      const user: User = { ...sampleUser, org: undefined };
      const result = new UserResource(user).transform();

      expect(result.orgName).toBeUndefined();
    });

    it('applies the transform callback when relation is present', () => {
      const result = new UserResource(sampleUser).transform();

      expect(result.orgName).toBe('Acme');
    });

    it('returns the relation directly when no transform is given', () => {
      const result = new UserResource(sampleUser).transform();

      expect(result.profile).toEqual({ bio: 'Hello world' });
    });
  });

  describe('resource() — nested resources', () => {
    it('transforms a related model through another Resource', () => {
      const post: Post = {
        id: 'p1',
        title: 'My Post',
        published: true,
        author: sampleUser,
      };
      const result = new PostResource(post).transform();

      expect(result.author).toEqual({
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        orgName: 'Acme',
        profile: { bio: 'Hello world' },
      });
    });

    it('returns undefined when the related data is null', () => {
      const post: Post = {
        id: 'p1',
        title: 'Orphan Post',
        published: false,
        author: null,
      };
      const result = new PostResource(post).transform();

      expect(result.author).toBeUndefined();
    });
  });

  describe('merge()', () => {
    it('returns transform output merged with extra data', () => {
      const resource = new UserResource(sampleUser);
      const merged = resource.merge({ extra: true, score: 42 });

      expect(merged).toMatchObject({
        id: 'u1',
        name: 'Alice',
        extra: true,
        score: 42,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — toJSON() with sparse fieldsets (manual transform mode)
// ---------------------------------------------------------------------------

describe('Resource.toJSON() — sparse fieldsets', () => {
  const sampleUser: User = {
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'secret-hash',
  };

  it('returns full transform output when no fields are specified', () => {
    const result = new UserResource(sampleUser).toJSON();

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
  });

  it('filters to only requested fields', () => {
    const result = new UserResource(sampleUser).toJSON({ fields: ['id', 'name'] });

    expect(result).toEqual({ id: 'u1', name: 'Alice' });
    expect(result).not.toHaveProperty('email');
  });

  it('ignores fields not present in the output', () => {
    const result = new UserResource(sampleUser).toJSON({ fields: ['id', 'nonexistent'] });

    expect(result).toEqual({ id: 'u1' });
  });
});

// ---------------------------------------------------------------------------
// Tests — Decorator-driven serialization
// ---------------------------------------------------------------------------

describe('Decorator-driven Resource', () => {
  const sampleArticle: Article = {
    id: 'a1',
    title: 'Hello World',
    body: 'Article body content',
    internalNotes: 'Secret internal notes',
    published: true,
    author: { id: 'u1', name: 'Alice' },
    tags: [
      { id: 't1', label: 'TypeScript' },
      { id: 't2', label: 'CruzJS' },
    ],
  };

  it('serializes fields using decorator metadata', () => {
    const result = new ArticleResource(sampleArticle).toJSON();

    expect(result).toHaveProperty('id', 'a1');
    expect(result).toHaveProperty('body', 'Article body content');
  });

  it('renames fields via @Field({ name })', () => {
    const result = new ArticleResource(sampleArticle).toJSON();

    expect(result).toHaveProperty('headline', 'Hello World');
    expect(result).not.toHaveProperty('title');
  });

  it('excludes @Hidden fields', () => {
    const result = new ArticleResource(sampleArticle).toJSON();

    expect(result).not.toHaveProperty('internalNotes');
  });

  it('includes @Computed getter fields', () => {
    const result = new ArticleResource(sampleArticle).toJSON();

    expect(result).toHaveProperty('slug', 'hello-world');
  });

  it('includes @When fields when condition is true', () => {
    const ctx: SerializationContext = { user: { id: 'u1', role: 'admin' } };
    const result = new ArticleResource(sampleArticle).toJSON(ctx);

    expect(result).toHaveProperty('published', true);
  });

  it('excludes @When fields when condition is false', () => {
    const ctx: SerializationContext = { user: { id: 'u1', role: 'member' } };
    const result = new ArticleResource(sampleArticle).toJSON(ctx);

    expect(result).not.toHaveProperty('published');
  });

  it('includes @When fields when no context is provided', () => {
    // No ctx at all — condition function receives undefined ctx
    // The When decorator checks `ctx && !condition(ctx)`, so without ctx it should include
    const result = new ArticleResource(sampleArticle).toJSON();

    expect(result).toHaveProperty('published');
  });

  describe('@Include relationships', () => {
    it('includes eager relations by default', () => {
      const result = new ArticleResource(sampleArticle).toJSON();

      expect(result).toHaveProperty('author');
      expect(result.author).toEqual({ id: 'u1', name: 'Alice' });
    });

    it('excludes lazy relations when not requested', () => {
      const result = new ArticleResource(sampleArticle).toJSON();

      expect(result).not.toHaveProperty('tags');
    });

    it('includes lazy relations when explicitly requested via includes', () => {
      const ctx: SerializationContext = { includes: ['tags'] };
      const result = new ArticleResource(sampleArticle).toJSON(ctx);

      expect(result).toHaveProperty('tags');
      expect(result.tags).toEqual([
        { id: 't1', label: 'TypeScript' },
        { id: 't2', label: 'CruzJS' },
      ]);
    });

    it('returns undefined for null relations', () => {
      const article: Article = { ...sampleArticle, author: null };
      const result = new ArticleResource(article).toJSON();

      expect(result.author).toBeUndefined();
    });
  });

  describe('sparse fieldsets with decorators', () => {
    it('filters decorator output to only requested fields', () => {
      const ctx: SerializationContext = {
        fields: ['id', 'headline'],
        user: { id: 'u1', role: 'admin' },
      };
      const result = new ArticleResource(sampleArticle).toJSON(ctx);

      expect(result).toEqual({ id: 'a1', headline: 'Hello World' });
      expect(result).not.toHaveProperty('body');
      expect(result).not.toHaveProperty('slug');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — ResourceCollection
// ---------------------------------------------------------------------------

describe('ResourceCollection', () => {
  const users: User[] = [
    {
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      passwordHash: 'h1',
    },
    {
      id: 'u2',
      name: 'Bob',
      email: 'bob@example.com',
      passwordHash: 'h2',
    },
    {
      id: 'u3',
      name: 'Carol',
      email: 'carol@example.com',
      passwordHash: 'h3',
    },
  ];

  it('transforms all items', () => {
    const collection = ResourceCollection.from(UserResource, users);
    const transformed = collection.transform();

    expect(transformed).toHaveLength(3);
    expect(transformed[0]).toEqual({
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      orgName: undefined,
      profile: undefined,
    });
  });

  it('toResponse() returns { data } without pagination', () => {
    const response = ResourceCollection.from(UserResource, users).toResponse();

    expect(response).toHaveProperty('data');
    expect((response as any).meta).toBeUndefined();
    expect((response as any).links).toBeUndefined();
    expect(response.data).toHaveLength(3);
  });

  it('toResponse() returns paginated envelope with meta + links', () => {
    const meta = { total: 100, page: 2, perPage: 20, lastPage: 5 };
    const response = ResourceCollection.from(
      UserResource,
      users,
      meta,
    ).toResponse();

    expect(response).toHaveProperty('meta', meta);
    expect(response).toHaveProperty('links');

    const links = (response as any).links;
    expect(links.next).toBe('?page=3');
    expect(links.prev).toBe('?page=1');
    expect(links.first).toBe('?page=1');
    expect(links.last).toBe('?page=5');
  });

  it('omits prev link on first page', () => {
    const meta = { total: 50, page: 1, perPage: 20, lastPage: 3 };
    const response = ResourceCollection.from(
      UserResource,
      users,
      meta,
    ).toResponse();

    const links = (response as any).links;
    expect(links.prev).toBeUndefined();
    expect(links.next).toBe('?page=2');
  });

  it('omits next link on last page', () => {
    const meta = { total: 50, page: 3, perPage: 20, lastPage: 3 };
    const response = ResourceCollection.from(
      UserResource,
      users,
      meta,
    ).toResponse();

    const links = (response as any).links;
    expect(links.next).toBeUndefined();
    expect(links.prev).toBe('?page=2');
  });

  it('from() static factory constructs a collection', () => {
    const collection = ResourceCollection.from(UserResource, users);

    expect(collection).toBeInstanceOf(ResourceCollection);
    expect(collection.transform()).toHaveLength(3);
  });

  describe('toJSONArray() — decorator-driven collection', () => {
    const articles: Article[] = [
      {
        id: 'a1',
        title: 'First',
        body: 'Body 1',
        internalNotes: 'secret',
        published: true,
        author: { id: 'u1', name: 'Alice' },
        tags: null,
      },
      {
        id: 'a2',
        title: 'Second',
        body: 'Body 2',
        internalNotes: 'secret',
        published: false,
        author: null,
        tags: null,
      },
    ];

    it('serializes all items using toJSON', () => {
      const collection = ResourceCollection.from(ArticleResource, articles);
      const result = collection.toJSONArray();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('headline', 'First');
      expect(result[0]).not.toHaveProperty('internalNotes');
      expect(result[1]).toHaveProperty('headline', 'Second');
    });

    it('toJSONResponse() returns paginated envelope', () => {
      const meta = { total: 50, page: 1, perPage: 25, lastPage: 2 };
      const collection = ResourceCollection.from(ArticleResource, articles, meta);
      const response = collection.toJSONResponse();

      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta', meta);
      expect(response.data).toHaveLength(2);
    });

    it('toJSONResponse() returns { data } without pagination', () => {
      const collection = ResourceCollection.from(ArticleResource, articles);
      const response = collection.toJSONResponse();

      expect(response).toHaveProperty('data');
      expect((response as any).meta).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Pagination helpers
// ---------------------------------------------------------------------------

describe('Pagination helpers', () => {
  describe('buildPaginationMeta()', () => {
    it('computes lastPage correctly', () => {
      const meta = buildPaginationMeta(100, 1, 20);

      expect(meta).toEqual({
        total: 100,
        page: 1,
        perPage: 20,
        lastPage: 5,
      });
    });

    it('rounds up lastPage for partial pages', () => {
      const meta = buildPaginationMeta(101, 1, 20);

      expect(meta.lastPage).toBe(6);
    });

    it('returns lastPage 1 when total is 0', () => {
      const meta = buildPaginationMeta(0, 1, 20);

      expect(meta.lastPage).toBe(1);
    });
  });

  describe('paginate()', () => {
    const items = Array.from({ length: 55 }, (_, i) => ({ id: i + 1 }));

    it('returns the correct slice for page 1', () => {
      const result = paginate(items, 1, 20);

      expect(result.data).toHaveLength(20);
      expect(result.data[0]).toEqual({ id: 1 });
      expect(result.data[19]).toEqual({ id: 20 });
      expect(result.meta.total).toBe(55);
      expect(result.meta.page).toBe(1);
      expect(result.meta.perPage).toBe(20);
      expect(result.meta.lastPage).toBe(3);
    });

    it('returns the correct slice for the last page', () => {
      const result = paginate(items, 3, 20);

      expect(result.data).toHaveLength(15);
      expect(result.data[0]).toEqual({ id: 41 });
    });

    it('returns empty data for a page beyond the last', () => {
      const result = paginate(items, 10, 20);

      expect(result.data).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — ResourceTransformer service
// ---------------------------------------------------------------------------

describe('ResourceTransformer', () => {
  const transformer = new ResourceTransformer();

  const sampleUser: User = {
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'secret-hash',
  };

  it('transforms a single resource', () => {
    const resource = new UserResource(sampleUser);
    const result = transformer.transform(resource);

    expect(result).toHaveProperty('id', 'u1');
    expect(result).toHaveProperty('name', 'Alice');
  });

  it('transforms a collection of resources', () => {
    const resources = [
      new UserResource(sampleUser),
      new UserResource({ ...sampleUser, id: 'u2', name: 'Bob' }),
    ];
    const result = transformer.transformCollection(resources);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id', 'u1');
    expect(result[1]).toHaveProperty('id', 'u2');
  });

  it('transforms models through a Resource class', () => {
    const models: User[] = [sampleUser, { ...sampleUser, id: 'u2', name: 'Bob' }];
    const result = transformer.transformModels(UserResource, models);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('name', 'Alice');
    expect(result[1]).toHaveProperty('name', 'Bob');
  });

  it('transforms a single model through a Resource class', () => {
    const result = transformer.transformModel(UserResource, sampleUser);

    expect(result).toHaveProperty('id', 'u1');
  });

  it('transforms models with pagination', () => {
    const models: User[] = [sampleUser];
    const meta = { total: 50, page: 1, perPage: 25, lastPage: 2 };
    const result = transformer.transformPaginated(UserResource, models, meta);

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(meta);
  });

  it('passes serialization context through', () => {
    const article: Article = {
      id: 'a1',
      title: 'Test',
      body: 'Body',
      internalNotes: 'secret',
      published: true,
      author: { id: 'u1', name: 'Alice' },
      tags: [{ id: 't1', label: 'TS' }],
    };

    const ctx: SerializationContext = {
      fields: ['id', 'headline'],
      user: { id: 'u1', role: 'admin' },
    };
    const result = transformer.transformModel(ArticleResource, article, ctx);

    expect(result).toEqual({ id: 'a1', headline: 'Test' });
  });
});

// ---------------------------------------------------------------------------
// Tests — resourceMiddleware
// ---------------------------------------------------------------------------

describe('resourceMiddleware', () => {
  // Tested indirectly — the middleware signature requires tRPC's next() pattern.
  // Here we test the underlying Resource.toJSON behavior which is what the middleware calls.

  it('Resource.toJSON() is used by middleware-like transform pipeline', () => {
    const article: Article = {
      id: 'a1',
      title: 'Test Middleware',
      body: 'Content',
      internalNotes: 'hidden',
      published: false,
      author: null,
      tags: null,
    };

    // Simulate what the middleware does
    const resource = new ArticleResource(article);
    const ctx: SerializationContext = { user: { id: 'u1', role: 'member' } };
    const result = resource.toJSON(ctx);

    expect(result).toHaveProperty('id', 'a1');
    expect(result).toHaveProperty('headline', 'Test Middleware');
    expect(result).not.toHaveProperty('internalNotes');
    expect(result).not.toHaveProperty('published'); // role is 'member'
  });
});
