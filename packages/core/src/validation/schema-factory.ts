import { z } from 'zod';

/**
 * Creates a paired set of create and update Zod schemas from a single shape definition.
 * The update schema is a partial version of the create schema, with optional field overrides.
 *
 * @example
 * const { createSchema, updateSchema } = createValidationSchemas({
 *   name: z.string().min(1).max(100),
 *   description: z.string().optional(),
 *   status: z.enum(['active', 'inactive']),
 * });
 */
export function createValidationSchemas<T extends z.ZodRawShape>(
  shape: T,
  options?: {
    /** Override specific fields in the update schema */
    updateOverrides?: Partial<{ [K in keyof T]: z.ZodTypeAny }>;
    /** Additional fields only present in create schema */
    createOnly?: z.ZodRawShape;
    /** Additional fields only present in update schema */
    updateOnly?: z.ZodRawShape;
  },
) {
  const createSchema = z.object({
    ...shape,
    ...(options?.createOnly ?? {}),
  });

  const updateSchema = z.object({
    ...Object.fromEntries(
      Object.entries(shape).map(([key, value]) => [key, value.optional()]),
    ),
    ...(options?.updateOverrides ?? {}),
    ...(options?.updateOnly ?? {}),
  } as { [K in keyof T]: z.ZodOptional<T[K]> });

  return {
    createSchema,
    updateSchema,
  };
}
