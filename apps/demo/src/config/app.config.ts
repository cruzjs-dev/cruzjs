/**
 * Application configuration
 * Reads from environment variables with sensible defaults
 */

// Get app name from environment or use default
// In Vite, we use import.meta.env for client-side env vars
const getAppName = (): string => {
  // Server-side (Node.js)
  if (typeof process !== 'undefined' && process.env?.VITE_APP_NAME) {
    return process.env.VITE_APP_NAME;
  }
  // Client-side (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_NAME) {
    return import.meta.env.VITE_APP_NAME;
  }
  return 'CruzJS';
};

export const appConfig = {
  name: getAppName(),
} as const;

export default appConfig;
