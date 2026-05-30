/**
 * Backward-compatible re-export of the Logger service.
 *
 * The canonical location is now `@cruzjs/core/logging`.
 * This file exists so that existing imports from
 * `@cruzjs/core/shared/logging/logger.service` continue to work.
 */

export { Logger } from '../../logging/logger.service';
