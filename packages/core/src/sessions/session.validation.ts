/**
 * Session Validation Schemas
 *
 * Zod schemas for session tRPC inputs.
 */

import { z } from 'zod';

export const revokeSessionSchema = z.object({
  id: z.string().min(1),
});

export const getSessionByTokenSchema = z.object({
  token: z.string().min(1),
});

export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;
export type GetSessionByTokenInput = z.infer<typeof getSessionByTokenSchema>;
