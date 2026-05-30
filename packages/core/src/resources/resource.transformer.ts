/**
 * Resource Transformer
 *
 * Injectable service that applies resource serialization with context.
 * Useful when you need DI-friendly access to the serialization pipeline
 * (e.g., in services or tRPC routers).
 */

import { Injectable } from '../di';
import type { Resource } from './resource';
import type { PaginationMeta, SerializationContext } from './resource.types';

@Injectable()
export class ResourceTransformer {
  /**
   * Transform a single resource with optional context.
   */
  transform<T>(resource: Resource<T, any>, ctx?: SerializationContext): Record<string, unknown> {
    return resource.toJSON(ctx);
  }

  /**
   * Transform an array of resources with optional context.
   */
  transformCollection<T>(
    resources: Resource<T, any>[],
    ctx?: SerializationContext,
  ): Record<string, unknown>[] {
    return resources.map((r) => r.toJSON(ctx));
  }

  /**
   * Transform an array of models through a Resource class with optional context.
   */
  transformModels<TModel>(
    ResourceClass: new (model: TModel) => Resource<TModel, any>,
    models: TModel[],
    ctx?: SerializationContext,
  ): Record<string, unknown>[] {
    return models.map((model) => new ResourceClass(model).toJSON(ctx));
  }

  /**
   * Transform a single model through a Resource class with optional context.
   */
  transformModel<TModel>(
    ResourceClass: new (model: TModel) => Resource<TModel, any>,
    model: TModel,
    ctx?: SerializationContext,
  ): Record<string, unknown> {
    return new ResourceClass(model).toJSON(ctx);
  }

  /**
   * Transform models with pagination metadata.
   */
  transformPaginated<TModel>(
    ResourceClass: new (model: TModel) => Resource<TModel, any>,
    models: TModel[],
    meta: PaginationMeta,
    ctx?: SerializationContext,
  ): { data: Record<string, unknown>[]; meta: PaginationMeta } {
    const data = this.transformModels(ResourceClass, models, ctx);
    return { data, meta };
  }
}
