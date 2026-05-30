import { z } from 'zod';

/**
 * Password validation schema
 * Requirements: min 8 chars, at least one uppercase, one lowercase, one number
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Email validation schema
 */
const emailSchema = z.string().email('Invalid email address').toLowerCase();

/**
 * Register input validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
  inviteCode: z.string().optional(),
});

/**
 * Login input validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Verify email input validation schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Request password reset input validation schema
 */
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password input validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

/**
 * Refresh token input validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

