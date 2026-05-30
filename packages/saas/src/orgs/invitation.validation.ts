import { z } from 'zod';

/**
 * Validation schemas for invitation endpoints
 */

/**
 * OrgRole enum values for validation
 */
const OrgRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;

/**
 * Create invitation validation schema
 */
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(OrgRole, {
    message: 'Invalid role',
  }),
});

/**
 * Update invitation validation schema
 * Allows updating role and expiration date, but not email
 */
export const updateInvitationSchema = z.object({
  role: z.nativeEnum(OrgRole, {
    message: 'Invalid role',
  }).optional(),
  expiresAt: z.coerce.date().optional(),
});


