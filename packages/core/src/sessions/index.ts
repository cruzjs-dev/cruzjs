/**
 * @cruzjs/core Sessions
 *
 * Session management with adapter pattern, device fingerprinting,
 * concurrent session limits, and tRPC endpoints.
 */

// Types
export type { SessionData, CreateSessionInput, SessionConfig } from './session.types';
export { SESSION_ADAPTER, DEFAULT_SESSION_CONFIG } from './session.types';

// Adapter interface
export type { SessionAdapter } from './session.adapter';

// Service
export { SessionService } from './session.service';

// Database adapter
export { DatabaseSessionAdapter } from './adapters/database.session.adapter';

// Fingerprinting
export { generateDeviceFingerprint, parseDeviceLabel } from './session.fingerprint';

// tRPC Router
export { SessionTrpc } from './session.trpc';

// Module
export { SessionModule } from './session.module';

// Schema
export { managedSessions } from './session.schema';
export type { ManagedSession, NewManagedSession } from './session.schema';

// Validation
export { revokeSessionSchema } from './session.validation';
export type { RevokeSessionInput } from './session.validation';
