/**
 * Search Validation Schemas
 *
 * Zod schemas for tRPC search inputs.
 */

import { z } from 'zod';

export const searchOptionsSchema = z.object({
  query: z.string().min(1).max(500).trim(),
  type: z.string().max(100).optional(),
  fields: z.array(z.string().max(100)).max(20).optional(),
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  facets: z.array(z.string().max(100)).max(10).optional(),
  highlight: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const reindexSchema = z.object({
  type: z.string().min(1).max(100).trim(),
});

export type SearchOptionsInput = z.infer<typeof searchOptionsSchema>;
export type ReindexInput = z.infer<typeof reindexSchema>;
