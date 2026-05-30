/**
 * Flash Message Types
 *
 * Flash messages are one-time session messages that persist across
 * a single redirect: set -> redirect -> read -> gone.
 */

export type FlashLevel = 'success' | 'error' | 'warning' | 'info';

export type FlashMessage = {
  level: FlashLevel;
  message: string;
  title?: string;
};

/** Cookie name used to store flash messages */
export const FLASH_COOKIE_NAME = '__cruz_flash';
