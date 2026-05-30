/**
 * Resource Collection
 *
 * Wraps an array of models and transforms each one via the given
 * Resource class. Optionally attaches pagination metadata.
 * Supports both manual `transform()` and decorator-driven `toJSON(ctx)`.
 */

import type {
  PaginatedResponse,
  PaginationLinks,
  PaginationMeta,
  SerializationContext,
} from './resource.types';
import type { Resource } from './resource';

export class ResourceCollection<
  TModel,
  TResource extends Resource<TModel, any>,
> {
  constructor(
    private readonly ResourceClass: new (model: TModel) => TResource,
    private readonly items: TModel[],
    private readonly paginationMeta?: PaginationMeta,
  ) {}

  /** Transform every item through the Resource class (manual mode). */
  transform(): ReturnType<TResource['transform']>[] {
    return this.items.map(
      (item) =>
        new this.ResourceClass(item).transform() as ReturnType<
          TResource['transform']
        >,
    );
  }

  /**
   * Serialize every item using decorator-driven `toJSON(ctx)`.
   */
  toJSONArray(ctx?: SerializationContext): Record<string, unknown>[] {
    return this.items.map((item) => new this.ResourceClass(item).toJSON(ctx));
  }

  /**
   * Return a response envelope.
   *
   * When pagination metadata is present the response includes `meta`
   * and `links`; otherwise only `data` is returned.
   */
  toResponse():
    | PaginatedResponse<ReturnType<TResource['transform']>>
    | { data: ReturnType<TResource['transform']>[] } {
    const data = this.transform();

    if (!this.paginationMeta) {
      return { data };
    }

    return {
      data,
      meta: this.paginationMeta,
      links: this.buildLinks(),
    };
  }

  /**
   * Return a response envelope with decorator-driven serialization.
   */
  toJSONResponse(
    ctx?: SerializationContext,
  ):
    | { data: Record<string, unknown>[]; meta: PaginationMeta; links: PaginationLinks }
    | { data: Record<string, unknown>[] } {
    const data = this.toJSONArray(ctx);

    if (!this.paginationMeta) {
      return { data };
    }

    return {
      data,
      meta: this.paginationMeta,
      links: this.buildLinks(),
    };
  }

  private buildLinks(): PaginationLinks {
    if (!this.paginationMeta) {
      return {};
    }

    const { page, lastPage } = this.paginationMeta;
    const links: PaginationLinks = {};

    if (page < lastPage) {
      links.next = `?page=${page + 1}`;
    }

    if (page > 1) {
      links.prev = `?page=${page - 1}`;
    }

    links.first = '?page=1';
    links.last = `?page=${lastPage}`;

    return links;
  }

  /** Static factory. */
  static from<TModel, TResource extends Resource<TModel, any>>(
    ResourceClass: new (model: TModel) => TResource,
    items: TModel[],
    meta?: PaginationMeta,
  ): ResourceCollection<TModel, TResource> {
    return new ResourceCollection(ResourceClass, items, meta);
  }
}
