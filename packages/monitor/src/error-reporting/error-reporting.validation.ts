/**
 * Error Reporting Validation Schemas
 */

import { z } from 'zod';

export const errorSeveritySchema = z.enum(['fatal', 'error', 'warning', 'info']);

export const breadcrumbSchema = z.object({
  category: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  level: errorSeveritySchema,
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const errorContextSchema = z.object({
  user: z
    .object({
      id: z.string().min(1),
      email: z.string().email().optional(),
      username: z.string().optional(),
    })
    .optional(),
  org: z
    .object({
      id: z.string().min(1),
      slug: z.string().optional(),
    })
    .optional(),
  request: z
    .object({
      url: z.string().url(),
      method: z.string(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.unknown().optional(),
    })
    .optional(),
  tags: z.record(z.string(), z.string()).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
  breadcrumbs: z.array(breadcrumbSchema).optional(),
});

export const captureErrorSchema = z.object({
  severity: errorSeveritySchema.optional(),
  context: errorContextSchema.partial().optional(),
  fingerprint: z.array(z.string()).optional(),
});

export const captureMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  severity: errorSeveritySchema.optional(),
});

export type CaptureErrorInput = z.infer<typeof captureErrorSchema>;
export type CaptureMessageInput = z.infer<typeof captureMessageSchema>;
export type ErrorContextInput = z.infer<typeof errorContextSchema>;
