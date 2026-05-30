/**
 * Soft Delete Types
 *
 * Core types for the soft delete system.
 */

export const SoftDeleteScope = {
  DEFAULT: 'default',
  WITH_DELETED: 'with_deleted',
  ONLY_DELETED: 'only_deleted',
} as const;
export type SoftDeleteScope = (typeof SoftDeleteScope)[keyof typeof SoftDeleteScope];

export interface SoftDeletable {
  deletedAt: Date | null;
}

export interface SoftDeleteOptions {
  scope?: SoftDeleteScope;
  force?: boolean;
}
