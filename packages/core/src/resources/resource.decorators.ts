/**
 * Resource Decorators
 *
 * Decorators for declarative resource field configuration.
 * Use these on Resource subclass properties to control serialization
 * without writing manual `transform()` logic.
 *
 * @example
 * ```typescript
 * class UserResource extends Resource<User> {
 *   @Field() id!: string;
 *   @Field({ name: 'full_name' }) name!: string;
 *   @Computed() get displayName() { return `${this.model.name} <${this.model.email}>`; }
 *   @Hidden() passwordHash!: string;
 *   @When((ctx) => ctx.user?.role === 'admin') email!: string;
 *   @Include({ relation: 'posts', resource: PostResource }) posts!: PostResource[];
 * }
 * ```
 */

import type { FieldOptions, IncludeOptions, SerializationContext } from './resource.types';

// ── Metadata Keys ───────────────────────────────────────────────────────────

const FIELD_METADATA_KEY = Symbol.for('cruzjs:resource:field');
const COMPUTED_METADATA_KEY = Symbol.for('cruzjs:resource:computed');
const HIDDEN_METADATA_KEY = Symbol.for('cruzjs:resource:hidden');
const WHEN_METADATA_KEY = Symbol.for('cruzjs:resource:when');
const INCLUDE_METADATA_KEY = Symbol.for('cruzjs:resource:include');
const ALL_FIELDS_KEY = Symbol.for('cruzjs:resource:all-fields');

// ── Field Registration Helper ───────────────────────────────────────────────

function registerFieldName(target: object, propertyKey: string): void {
  const existing: string[] = Reflect.getOwnMetadata(ALL_FIELDS_KEY, target.constructor) ?? [];
  if (!existing.includes(propertyKey)) {
    Reflect.defineMetadata(ALL_FIELDS_KEY, [...existing, propertyKey], target.constructor);
  }
}

// ── Decorators ──────────────────────────────────────────────────────────────

/**
 * Mark a property as a serializable field.
 *
 * @param options.name - Override the output field name
 * @param options.computed - Indicate this is a computed (getter) field
 */
export function Field(options?: FieldOptions): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = String(propertyKey);
    registerFieldName(target, key);
    Reflect.defineMetadata(FIELD_METADATA_KEY, options ?? {}, target.constructor, key);
  };
}

/**
 * Mark a property as a computed field.
 * Computed fields are derived from the model rather than direct properties.
 * Shorthand for `@Field({ computed: true })`.
 */
export function Computed(): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = String(propertyKey);
    registerFieldName(target, key);
    const options: FieldOptions = { computed: true };
    Reflect.defineMetadata(FIELD_METADATA_KEY, options, target.constructor, key);
    Reflect.defineMetadata(COMPUTED_METADATA_KEY, true, target.constructor, key);
  };
}

/**
 * Mark a property as hidden. Hidden fields are never included in serialization output.
 */
export function Hidden(): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = String(propertyKey);
    Reflect.defineMetadata(HIDDEN_METADATA_KEY, true, target.constructor, key);
  };
}

/**
 * Conditionally include a field based on the serialization context.
 *
 * @param condition - Function that receives the SerializationContext and returns true to include the field
 *
 * @example
 * ```typescript
 * @When((ctx) => ctx.user?.role === 'admin')
 * internalNotes!: string;
 * ```
 */
export function When(condition: (ctx: SerializationContext) => boolean): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = String(propertyKey);
    registerFieldName(target, key);
    Reflect.defineMetadata(WHEN_METADATA_KEY, condition, target.constructor, key);
    // Also register as a field if not already
    if (!Reflect.getOwnMetadata(FIELD_METADATA_KEY, target.constructor, key)) {
      Reflect.defineMetadata(FIELD_METADATA_KEY, {}, target.constructor, key);
    }
  };
}

/**
 * Mark a property as a relationship include.
 *
 * @param options.relation - Property name on the model holding the related data
 * @param options.resource - Resource class to transform the related data through
 * @param options.lazy - If true, only include when explicitly requested via `includes`
 *
 * @example
 * ```typescript
 * @Include({ relation: 'posts', resource: PostResource, lazy: true })
 * posts!: PostOutput[];
 * ```
 */
export function Include(options: IncludeOptions): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = String(propertyKey);
    registerFieldName(target, key);
    Reflect.defineMetadata(INCLUDE_METADATA_KEY, options, target.constructor, key);
    if (!Reflect.getOwnMetadata(FIELD_METADATA_KEY, target.constructor, key)) {
      Reflect.defineMetadata(FIELD_METADATA_KEY, {}, target.constructor, key);
    }
  };
}

// ── Metadata Retrieval ──────────────────────────────────────────────────────

/**
 * Get all registered field names for a Resource class (or instance constructor).
 */
export function getResourceFields(target: any): Map<string, FieldOptions> {
  const ctor = typeof target === 'function' ? target : target.constructor;
  const fieldNames: string[] = Reflect.getOwnMetadata(ALL_FIELDS_KEY, ctor) ?? [];
  const result = new Map<string, FieldOptions>();

  for (const name of fieldNames) {
    const options: FieldOptions | undefined = Reflect.getOwnMetadata(FIELD_METADATA_KEY, ctor, name);
    result.set(name, options ?? {});
  }

  return result;
}

/**
 * Check if a field is hidden.
 */
export function isHiddenField(target: any, propertyKey: string): boolean {
  const ctor = typeof target === 'function' ? target : target.constructor;
  return Reflect.getOwnMetadata(HIDDEN_METADATA_KEY, ctor, propertyKey) === true;
}

/**
 * Check if a field is computed.
 */
export function isComputedField(target: any, propertyKey: string): boolean {
  const ctor = typeof target === 'function' ? target : target.constructor;
  return Reflect.getOwnMetadata(COMPUTED_METADATA_KEY, ctor, propertyKey) === true;
}

/**
 * Get the conditional function for a field, if any.
 */
export function getWhenCondition(
  target: any,
  propertyKey: string,
): ((ctx: SerializationContext) => boolean) | undefined {
  const ctor = typeof target === 'function' ? target : target.constructor;
  return Reflect.getOwnMetadata(WHEN_METADATA_KEY, ctor, propertyKey);
}

/**
 * Get the include options for a field, if any.
 */
export function getIncludeOptions(target: any, propertyKey: string): IncludeOptions | undefined {
  const ctor = typeof target === 'function' ? target : target.constructor;
  return Reflect.getOwnMetadata(INCLUDE_METADATA_KEY, ctor, propertyKey);
}
