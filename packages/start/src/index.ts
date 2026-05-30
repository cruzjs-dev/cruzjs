/**
 * @cruzjs/start - Starter Kit Package
 *
 * Provides common features for CruzJS applications:
 * - Organizations (members, invitations, permissions, RBAC)
 * - User profiles
 * - API keys
 * - Dashboard layouts
 * - Notifications (in-app, email, Slack)
 * - Real-time events
 * - Third-party integrations
 * - AI connections
 */

// Database schema
export * from './database/schema';

// Feature modules
export * from './orgs';
export * from './user-profile';
export * from './api-keys';
export * from './dashboard';
export * from './notifications';
export * from './real-time';
export * from './integrations';
export * from './ai-connections';
export * from './social-auth';

// Layout & Hooks
export { useFlash } from './layout/use-flash';

// Utilities
export { encryptToken, decryptToken, getEncryptionKey } from './utils/encryption';

// Module (preferred)
export { StartModule } from './start.module';

