/**
 * @cruzjs/core Soft Delete
 *
 * Soft delete support with scope filtering, bulk operations,
 * restore, force-delete, and tRPC middleware.
 */

// Types
export { SoftDeleteScope } from './soft-delete.types';
export type { SoftDeletable, SoftDeleteOptions } from './soft-delete.types';

// Columns
export { softDeleteColumns } from './soft-delete.columns';

// Service
export { SoftDeleteService } from './soft-delete.service';

// Middleware
export { softDeleteMiddleware } from './soft-delete.middleware';

// Module
export { SoftDeleteModule } from './soft-delete.module';
