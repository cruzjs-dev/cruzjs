/**
 * Maintenance Mode Types
 *
 * Internal state representation and public status types.
 */

/**
 * Full internal state stored in KV cache.
 * Contains the bypass secret and metadata about who enabled it.
 */
export type MaintenanceState = {
  active: boolean;
  message: string;
  retryAfter: number; // seconds
  secret: string | null;
  enabledAt: string | null;
  enabledBy: string | null;
};

/**
 * Public-facing status (no secret exposed).
 */
export type MaintenanceStatus = {
  active: boolean;
  message?: string;
  retryAfter?: number;
  enabledAt?: string;
};

/**
 * Default maintenance state when nothing is stored.
 */
export const DEFAULT_MAINTENANCE_STATE: MaintenanceState = {
  active: false,
  message: '',
  retryAfter: 3600,
  secret: null,
  enabledAt: null,
  enabledBy: null,
};

/** KV key for the maintenance state object */
export const MAINTENANCE_STATE_KEY = 'state';

/** Cookie name for bypass token persistence */
export const MAINTENANCE_BYPASS_COOKIE = 'maintenance_bypass';
