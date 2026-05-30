/**
 * Search Decorators
 *
 * Decorators for marking classes and properties as searchable.
 * Used to auto-configure search indexing for entities.
 */

import 'reflect-metadata';

const SEARCHABLE_METADATA_KEY = Symbol.for('cruzjs:searchable');
const SEARCH_FIELD_METADATA_KEY = Symbol.for('cruzjs:search-field');

export interface SearchableMetadata {
  type: string;
  fields: string[];
  weights?: Record<string, number>;
}

export interface SearchFieldMetadata {
  propertyKey: string;
  weight: number;
}

/**
 * Mark a class as searchable with field config.
 *
 * @example
 * ```typescript
 * @Searchable({ type: 'product', fields: ['name', 'description'], weights: { name: 3 } })
 * class Product { ... }
 * ```
 */
export function Searchable(options: {
  type: string;
  fields: string[];
  weights?: Record<string, number>;
}): ClassDecorator {
  return (target) => {
    const metadata: SearchableMetadata = {
      type: options.type,
      fields: options.fields,
      weights: options.weights,
    };
    Reflect.defineMetadata(SEARCHABLE_METADATA_KEY, metadata, target);
  };
}

/**
 * Mark a property as included in the search index.
 *
 * @example
 * ```typescript
 * class Product {
 *   @SearchField(3) name!: string;
 *   @SearchField() description!: string;
 * }
 * ```
 */
export function SearchField(weight = 1): PropertyDecorator {
  return (target, propertyKey) => {
    const fields: SearchFieldMetadata[] =
      Reflect.getMetadata(SEARCH_FIELD_METADATA_KEY, target.constructor) ?? [];

    fields.push({ propertyKey: String(propertyKey), weight });
    Reflect.defineMetadata(SEARCH_FIELD_METADATA_KEY, fields, target.constructor);
  };
}

/**
 * Get the @Searchable metadata from a class.
 */
export function getSearchableMetadata(target: unknown): SearchableMetadata | undefined {
  if (typeof target === 'function') {
    return Reflect.getMetadata(SEARCHABLE_METADATA_KEY, target) as SearchableMetadata | undefined;
  }
  return undefined;
}

/**
 * Get all @SearchField metadata from a class.
 */
export function getSearchFieldMetadata(target: unknown): SearchFieldMetadata[] {
  if (typeof target === 'function') {
    return Reflect.getMetadata(SEARCH_FIELD_METADATA_KEY, target) ?? [];
  }
  return [];
}
