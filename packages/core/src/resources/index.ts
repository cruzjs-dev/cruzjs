/**
 * @cruzjs/core Resources (API Serializers)
 *
 * Transform domain models into safe, consistent API responses.
 * Supports manual transform(), decorator-driven toJSON(ctx),
 * sparse fieldsets, conditional fields, and relationship includes.
 */

// Base classes
export { Resource } from './resource';
export { ResourceCollection } from './resource-collection';

// Pagination helpers
export { buildPaginationMeta, paginate } from './pagination';

// Decorators
export { Field, Computed, Hidden, When, Include, getResourceFields } from './resource.decorators';

// Transformer service
export { ResourceTransformer } from './resource.transformer';

// Middleware
export { resourceMiddleware } from './resource.middleware';

// Module
export { ResourceModule } from './resource.module';

// Types
export type {
  PaginatedResponse,
  PaginationLinks,
  PaginationMeta,
  ResourceOptions,
  FieldOptions,
  IncludeOptions,
  SerializationContext,
} from './resource.types';
