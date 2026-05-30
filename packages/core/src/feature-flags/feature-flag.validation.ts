/**
 * Feature Flag Validation Schemas
 *
 * Zod schemas for create/update operations on feature flags.
 */

import { z } from 'zod';

// ─── Flag CRUD ──────────────────────────────────────────────────────────────

export const createFlagSchema = z.object({
  key: z.string().min(1).max(100).trim().regex(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Key must contain only letters, numbers, underscores, dots, and hyphens',
  }),
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  type: z.enum(['boolean', 'percentage', 'segment']).default('boolean'),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  defaultValue: z.boolean().default(false),
});

export const updateFlagSchema = z.object({
  id: z.string(),
  data: z.object({
    name: z.string().min(1).max(200).trim().optional(),
    description: z.string().max(1000).optional(),
    type: z.enum(['boolean', 'percentage', 'segment']).optional(),
    enabled: z.boolean().optional(),
    rolloutPercentage: z.number().min(0).max(100).optional(),
    defaultValue: z.boolean().optional(),
  }),
});

export type CreateFlagInput = z.infer<typeof createFlagSchema>;
export type UpdateFlagInput = z.infer<typeof updateFlagSchema>;

// ─── Segments ───────────────────────────────────────────────────────────────

export const segmentSchema = z.object({
  segmentType: z.enum(['user', 'org', 'attribute']),
  attributeKey: z.string().max(100).optional(),
  operator: z.enum(['eq', 'neq', 'in', 'notIn', 'gt', 'lt', 'contains']),
  attributeValue: z.string().max(1000),
});

export const setSegmentsSchema = z.object({
  id: z.string(),
  segments: z.array(segmentSchema),
});

export type SegmentInput = z.infer<typeof segmentSchema>;
export type SetSegmentsInput = z.infer<typeof setSegmentsSchema>;

// ─── Overrides ──────────────────────────────────────────────────────────────

export const setOverrideSchema = z.object({
  flagId: z.string(),
  entityType: z.enum(['user', 'org']),
  entityId: z.string(),
  value: z.boolean(),
  expiresAt: z.string().optional(),
});

export type SetOverrideInput = z.infer<typeof setOverrideSchema>;

// ─── Evaluation ─────────────────────────────────────────────────────────────

export const evaluateSchema = z.object({
  flagKey: z.string(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type EvaluateInput = z.infer<typeof evaluateSchema>;
