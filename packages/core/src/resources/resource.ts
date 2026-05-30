/**
 * Base Resource class for API response transformations.
 *
 * Subclasses implement `transform()` to map a domain model into a
 * serialisation-safe output shape, keeping internal DB columns out
 * of the public API surface.
 *
 * Supports two modes:
 * 1. **Manual**: override `transform()` with explicit field mapping
 * 2. **Decorator-driven**: use `@Field`, `@Computed`, `@Hidden`, `@When`, `@Include`
 *    decorators and call `transformFromDecorators(ctx)` or rely on default `toJSON(ctx)`.
 */

import type { SerializationContext, FieldOptions, IncludeOptions } from './resource.types';
import {
  getResourceFields,
  isHiddenField,
  isComputedField,
  getWhenCondition,
  getIncludeOptions,
} from './resource.decorators';

export abstract class Resource<
  TModel,
  TOutput extends Record<string, unknown> = Record<string, unknown>,
> {
  constructor(protected readonly model: TModel) {}

  /** Map the model to its public representation. */
  abstract transform(): TOutput;

  /**
   * Serialize using decorator metadata + SerializationContext.
   *
   * Falls back to `transform()` if no decorator fields are registered.
   * Override this in subclasses for decorator-driven resources.
   */
  toJSON(ctx?: SerializationContext): Record<string, unknown> {
    const fields = getResourceFields(this);

    if (fields.size === 0) {
      // No decorators — use manual transform() and apply sparse fieldsets
      const result = this.transform() as Record<string, unknown>;
      return this.applyFieldSelection(result, ctx?.fields);
    }

    return this.transformFromDecorators(ctx);
  }

  /** Conditionally include a field. */
  protected when<T>(condition: boolean, value: T | (() => T)): T | undefined {
    if (!condition) {
      return undefined;
    }
    return typeof value === 'function' ? (value as () => T)() : value;
  }

  /** Include a field only when a relation is loaded (not null / undefined). */
  protected whenLoaded<T>(
    relation: T | null | undefined,
    transformFn?: (val: T) => unknown,
  ): unknown | undefined {
    if (relation === null || relation === undefined) {
      return undefined;
    }
    return transformFn ? transformFn(relation) : relation;
  }

  /** Return the transformed output merged with additional data. */
  merge(data: Record<string, unknown>): Record<string, unknown> {
    return { ...this.transform(), ...data };
  }

  /** Transform a related model through another Resource class. */
  protected resource<R extends Resource<any, any>>(
    ResourceClass: new (model: any) => R,
    data: any,
  ): ReturnType<R['transform']> | undefined {
    if (!data) {
      return undefined;
    }
    return new ResourceClass(data).transform() as ReturnType<R['transform']>;
  }

  /** Static factory — instantiate and transform in one call. */
  static from<T extends Resource<any, any>>(
    this: new (model: any) => T,
    model: any,
  ): ReturnType<T['transform']> {
    return new this(model).transform() as ReturnType<T['transform']>;
  }

  // ── Decorator-driven serialization ──────────────────────────────────────

  /**
   * Build output from decorator metadata.
   * Applies sparse fieldsets, conditional fields, includes, and field renaming.
   */
  protected transformFromDecorators(ctx?: SerializationContext): Record<string, unknown> {
    const registeredFields = getResourceFields(this);
    const result: Record<string, unknown> = {};
    const modelAny = this.model as any;
    const selfAny = this as any;

    for (const [propertyKey, fieldOptions] of registeredFields) {
      // Skip hidden fields
      if (isHiddenField(this, propertyKey)) {
        continue;
      }

      // Check conditional (@When)
      const condition = getWhenCondition(this, propertyKey);
      if (condition && ctx && !condition(ctx)) {
        continue;
      }

      // Check relationship includes
      const includeOpts = getIncludeOptions(this, propertyKey);
      if (includeOpts) {
        if (!this.shouldInclude(propertyKey, includeOpts, ctx)) {
          continue;
        }
        const outputName = fieldOptions.name ?? propertyKey;
        result[outputName] = this.resolveInclude(includeOpts, modelAny, ctx);
        continue;
      }

      // Determine the output key name
      const outputName = fieldOptions.name ?? propertyKey;

      // Resolve the value
      if (isComputedField(this, propertyKey)) {
        // Computed: read from `this` (getter or method)
        result[outputName] = selfAny[propertyKey];
      } else {
        // Direct model property
        result[outputName] = modelAny[propertyKey];
      }
    }

    return this.applyFieldSelection(result, ctx?.fields);
  }

  /**
   * Apply sparse fieldset selection: keep only the requested fields.
   */
  protected applyFieldSelection(
    result: Record<string, unknown>,
    fields?: string[],
  ): Record<string, unknown> {
    if (!fields || fields.length === 0) {
      return result;
    }

    const filtered: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in result) {
        filtered[field] = result[field];
      }
    }
    return filtered;
  }

  // ── Include helpers ───────────────────────────────────────────────────────

  private shouldInclude(
    propertyKey: string,
    options: IncludeOptions,
    ctx?: SerializationContext,
  ): boolean {
    if (options.lazy) {
      // Lazy includes require explicit request
      return ctx?.includes?.includes(propertyKey) ?? false;
    }
    return true;
  }

  private resolveInclude(
    options: IncludeOptions,
    modelData: any,
    ctx?: SerializationContext,
  ): unknown {
    const relationData = modelData[options.relation];
    if (relationData === null || relationData === undefined) {
      return undefined;
    }

    if (!options.resource) {
      return relationData;
    }

    const ResourceClass = options.resource;

    if (Array.isArray(relationData)) {
      return relationData.map((item: any) => {
        const res = new ResourceClass(item);
        return typeof res.toJSON === 'function' ? res.toJSON(ctx) : res.transform();
      });
    }

    const res = new ResourceClass(relationData);
    return typeof res.toJSON === 'function' ? res.toJSON(ctx) : res.transform();
  }
}
