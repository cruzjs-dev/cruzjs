/**
 * Admin Dashboard Validation Schemas
 *
 * Zod schemas for admin CRUD and impersonation operations.
 */

import { z } from 'zod';

// ─── Resource List ───────────────────────────────────────────────────────────

export const adminListInputSchema = z.object({
  resource: z.string().min(1),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  filters: z.record(z.string(), z.string()).optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export type AdminListInput = z.infer<typeof adminListInputSchema>;

// ─── Resource Get ────────────────────────────────────────────────────────────

export const adminGetInputSchema = z.object({
  resource: z.string().min(1),
  id: z.string().min(1),
});

export type AdminGetInput = z.infer<typeof adminGetInputSchema>;

// ─── Resource Create ─────────────────────────────────────────────────────────

export const adminCreateInputSchema = z.object({
  resource: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export type AdminCreateInput = z.infer<typeof adminCreateInputSchema>;

// ─── Resource Update ─────────────────────────────────────────────────────────

export const adminUpdateInputSchema = z.object({
  resource: z.string().min(1),
  id: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export type AdminUpdateInput = z.infer<typeof adminUpdateInputSchema>;

// ─── Resource Delete ─────────────────────────────────────────────────────────

export const adminDeleteInputSchema = z.object({
  resource: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1),
});

export type AdminDeleteInput = z.infer<typeof adminDeleteInputSchema>;

// ─── Execute Action ──────────────────────────────────────────────────────────

export const adminExecuteActionInputSchema = z.object({
  resource: z.string().min(1),
  action: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1),
});

export type AdminExecuteActionInput = z.infer<typeof adminExecuteActionInputSchema>;

// ─── Impersonation ───────────────────────────────────────────────────────────

export const adminImpersonateInputSchema = z.object({
  targetUserId: z.string().min(1),
});

export type AdminImpersonateInput = z.infer<typeof adminImpersonateInputSchema>;
