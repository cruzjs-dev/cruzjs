/**
 * @cruzjs/core/logging — Structured Logging
 *
 * Enhanced multi-channel logging with context propagation,
 * correlation IDs, and provider-agnostic adapters.
 */

// Core service
export { Logger, LOG_ADAPTER } from './logger.service';

// Adapter interface
export type { LogAdapter } from './log.adapter';

// Types
export type { LogLevel, LogEntry, LogChannel } from './log.types';
export { LOG_LEVEL_SEVERITY } from './log.types';

// Formatters
export { JsonLogFormatter } from './formatters/json.formatter';
export { PrettyLogFormatter } from './formatters/pretty.formatter';

// Middleware
export {
  generateCorrelationId,
  createRequestLogger,
  getCorrelationId,
} from './logging.middleware';

// Module
export { LoggingModule } from './logging.module';

// Context propagation
export { LogContext } from './log-context';

// New types
export type { LogContextStore, NamespaceLevelConfig, LoggingConfig, LoggerFactory } from './log.types';
export { LOGGER_FACTORY, LOGGING_CONFIG } from './log.types';

// Utilities
export { parseNamespaceLevels, resolveNamespaceLevel } from './namespace-levels';
export { buildRedactPaths } from './redaction';
