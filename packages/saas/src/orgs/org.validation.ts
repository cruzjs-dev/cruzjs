import { z } from 'zod';

/**
 * Validation schemas for organization endpoints
 */

/**
 * Create organization validation schema
 */
export const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(50, 'Organization name must be at most 50 characters')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  avatarUrl: z.string().url().optional().or(z.null()),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update organization validation schema
 */
export const updateOrgSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(50, 'Organization name must be at most 50 characters')
    .trim()
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  avatarUrl: z.string().url().optional().or(z.null()),
  settings: z.record(z.string(), z.unknown()).optional(),
});

