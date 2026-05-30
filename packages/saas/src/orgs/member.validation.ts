import { z } from 'zod';

/**
 * Validation schemas for member endpoints
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
 * Add member validation schema
 */
export const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(OrgRole, {
    message: 'Invalid role',
  }),
});

/**
 * Update member role validation schema
 */
export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(OrgRole, {
    message: 'Invalid role',
  }),
});

