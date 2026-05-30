/**
 * Monitor Validation Schemas
 */

import { z } from 'zod';
import { MonitorEntryTypeValues, MonitorEntryStatusValues } from './monitor.types';

export const listEntriesSchema = z.object({
  type: z.enum(MonitorEntryTypeValues).optional(),
  status: z.enum(MonitorEntryStatusValues).optional(),
  tag: z.string().optional(),
  limit: z.number().min(1).max(200).default(50),
  before: z.string().datetime().optional(),
});

export const getEntrySchema = z.object({
  id: z.string().min(1),
});

export const clearEntriesSchema = z.object({
  type: z.enum(MonitorEntryTypeValues).optional(),
});

export type ListEntriesInput = z.infer<typeof listEntriesSchema>;
export type GetEntryInput = z.infer<typeof getEntrySchema>;
export type ClearEntriesInput = z.infer<typeof clearEntriesSchema>;
