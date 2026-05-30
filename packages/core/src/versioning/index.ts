/**
 * @cruzjs/core API Versioning
 *
 * Version negotiation, decorators, middleware, and service
 * for managing API versions with header, URL path, or query param strategies.
 */

// Types
export type { ApiVersion, VersionStrategy, VersionConfig, VersionInfo } from './versioning.types';
export { VersionStrategy as VersionStrategyEnum, DEFAULT_VERSION_CONFIG } from './versioning.types';

// Negotiator
export { VersionNegotiator } from './version.negotiator';

// Service
export { VersioningService } from './versioning.service';

// Decorators
export { Version, Deprecated, getVersionMetadata, isDeprecated, getDeprecatedSunsetDate } from './versioning.decorators';

// Middleware
export { versionMiddleware, versionedProcedure, versionHeaders } from './versioning.middleware';

// Module
export { VersioningModule } from './versioning.module';
