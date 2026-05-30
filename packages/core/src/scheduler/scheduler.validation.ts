/**
 * Scheduler Validation Schemas
 *
 * Zod schemas for scheduler tRPC inputs.
 */

import { z } from 'zod';

export const runTaskSchema = z.object({
  name: z.string().min(1).max(200),
});

export const taskHistorySchema = z.object({
  name: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(100).default(20),
});

export const toggleTaskSchema = z.object({
  name: z.string().min(1).max(200),
});

export type RunTaskInput = z.infer<typeof runTaskSchema>;
export type TaskHistoryInput = z.infer<typeof taskHistorySchema>;
export type ToggleTaskInput = z.infer<typeof toggleTaskSchema>;
