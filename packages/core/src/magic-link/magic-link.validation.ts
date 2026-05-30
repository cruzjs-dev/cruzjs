/**
 * Magic Link Validation Schemas
 */

import { z } from 'zod';

export const requestMagicLinkSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  redirectTo: z.string().url().optional(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;
