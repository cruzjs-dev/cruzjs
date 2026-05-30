---
title: Validation
description: Input validation with Zod schemas in CruzJS.
---

CruzJS uses [Zod](https://zod.dev/) for runtime input validation. Zod schemas validate tRPC procedure inputs and provide automatic TypeScript type inference.

## Basic schema

Define validation schemas in a dedicated file per feature:

```ts
// apps/web/src/features/project/project.validation.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});
```

## Using schemas in tRPC procedures

Pass the schema to `.input()` on any procedure:

```ts
import { createProjectSchema, updateProjectSchema } from './project.validation';

export const projectRouter = router({
  create: orgProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // input is typed as { name: string; description?: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string(),
      data: updateProjectSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // input.id is string, input.data matches the update schema
    }),
});
```

If validation fails, tRPC automatically returns a `BAD_REQUEST` error with details about which fields failed and why.

## Inferring TypeScript types

Use `z.infer` to derive TypeScript types from your schemas. This keeps your types and validation in sync:

```ts
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

// Inferred type: { name: string; description?: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

// Inferred type: { name?: string; description?: string | null; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
```

Use these types in your service methods:

```ts
async create(orgId: string, userId: string, input: CreateProjectInput): Promise<ProjectResponse> {
  // input is fully typed
}
```

## Common patterns

### Strings

```ts
z.string()                          // Any string
z.string().min(1)                   // Required (non-empty)
z.string().min(1).max(100)          // Length bounds
z.string().trim()                   // Auto-trim whitespace
z.string().min(1).max(100).trim()   // Combine all three
z.string().toLowerCase()            // Normalize to lowercase
z.string().url()                    // Must be a valid URL
z.string().uuid()                   // Must be a UUID
z.string().regex(/^[a-z0-9-]+$/)   // Custom pattern (e.g., slug)
```

### Email

```ts
z.string().email()                          // Basic email validation
z.string().email().toLowerCase().trim()     // Normalized email
```

### Numbers

```ts
z.number()                    // Any number
z.number().int()              // Integer only
z.number().min(0)             // Non-negative
z.number().min(1).max(100)    // Range
z.number().positive()         // Greater than 0
z.coerce.number()             // Coerce string to number (useful for query params)
```

### Booleans

```ts
z.boolean()                   // true or false
z.boolean().default(false)    // Defaults to false if omitted
z.coerce.boolean()            // Coerce from string "true"/"false"
```

### Enums

```ts
z.enum(['LOW', 'MEDIUM', 'HIGH'])                     // String enum
z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM')    // With default
z.nativeEnum(ProjectStatus)                            // From TypeScript enum
```

### Dates

```ts
z.date()                      // Date object
z.string().datetime()         // ISO datetime string
z.coerce.date()               // Coerce string to Date
```

### Optional and nullable fields

```ts
z.string().optional()              // string | undefined
z.string().nullable()              // string | null
z.string().optional().nullable()   // string | null | undefined (allows clearing a value)
```

Use `.optional()` for fields the client can omit entirely, and `.nullable()` for fields the client can explicitly set to `null` (e.g., clearing a description).

### Arrays

```ts
z.array(z.string())                       // string[]
z.array(z.string().max(50)).max(10)       // Up to 10 strings, each max 50 chars
z.array(z.string()).min(1)                // At least one item
z.array(z.string()).nonempty()            // Same as .min(1) with better type
```

### Nested objects

```ts
const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/),
});

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  address: addressSchema.optional(),
});
```

### Records (key-value maps)

```ts
z.record(z.string(), z.unknown())    // { [key: string]: unknown }
z.record(z.string(), z.string())     // { [key: string]: string }
```

## Custom error messages

Override default error messages for better user-facing feedback:

```ts
const createProjectSchema = z.object({
  name: z.string({
    required_error: 'Project name is required',
  })
    .min(1, 'Project name cannot be empty')
    .max(100, 'Project name must be 100 characters or less')
    .trim(),

  email: z.string()
    .email('Please enter a valid email address'),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
    errorMap: () => ({ message: 'Priority must be LOW, MEDIUM, or HIGH' }),
  }),
});
```

## Reusing and composing schemas

### Extending schemas

```ts
const baseProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
});

// Create = all fields required (name already is)
const createProjectSchema = baseProjectSchema.extend({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Update = all fields optional
const updateProjectSchema = baseProjectSchema.partial().extend({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});
```

### Partial schemas

`.partial()` makes every field optional, useful for update operations:

```ts
const createSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

// All fields become optional
const updateSchema = createSchema.partial();
// Type: { name?: string; description?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
```

### Pick and omit

```ts
const fullSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  bio: z.string(),
});

// Only keep specific fields
const profileSchema = fullSchema.pick({ name: true, bio: true });

// Remove specific fields
const publicSchema = fullSchema.omit({ password: true });
```

### Merging schemas

```ts
const timestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

const projectResponseSchema = createProjectSchema.merge(timestampsSchema).extend({
  id: z.string(),
});
```

## Pagination and filtering schemas

Common reusable schemas for list endpoints:

```ts
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Use in a procedure
list: orgProcedure
  .input(paginationSchema.merge(sortSchema).extend({
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  }))
  .query(async ({ ctx, input }) => {
    // input.page, input.limit, input.sortBy, input.sortOrder, input.status
  }),
```

## Transforms and refinements

### Transform input values

```ts
const createSlugSchema = z.object({
  name: z.string().min(1).transform((val) =>
    val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  ),
});
// Input: { name: "My Project!" }
// Result: { name: "my-project" }
```

### Custom validation with refine

```ts
const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] },
);
```
