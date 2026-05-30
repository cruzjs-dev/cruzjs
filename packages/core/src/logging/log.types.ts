/**
 * Structured Logging Types
 *
 * Core type definitions for the CruzJS logging system.
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export type LogEntry = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

export type LogChannel = 'console' | 'database' | 'external';

/**
 * Numeric severity for log level comparison.
 * Higher number = more severe.
 */
export const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
};

export type LogContextStore = {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  orgId?: string;
  [key: string]: unknown;
};

export type NamespaceLevelConfig = {
  namespace: string;
  level: LogLevel;
};

export type LoggingConfig = {
  level?: LogLevel;
  namespaceLevels?: NamespaceLevelConfig[];
  redactPaths?: string[];
  transport?: {
    target: string;
    options?: Record<string, unknown>;
  };
};

export const LOGGER_FACTORY = Symbol.for('cruzjs:logger-factory');
export type LoggerFactory = (source: string) => import('./logger.service').Logger;

export const LOGGING_CONFIG = Symbol.for('cruzjs:logging-config');
