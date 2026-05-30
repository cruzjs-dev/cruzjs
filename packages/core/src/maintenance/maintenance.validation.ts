/**
 * Maintenance Mode Validation Schemas
 */

import { z } from 'zod';

export const enableMaintenanceSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(500)
    .default('System is under maintenance. Please try again later.'),
  retryAfter: z.number().int().min(60).max(86400).default(3600),
  secret: z.string().min(8).max(100).optional(),
});

export type EnableMaintenanceInput = z.infer<typeof enableMaintenanceSchema>;
