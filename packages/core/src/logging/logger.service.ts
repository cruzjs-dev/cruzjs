/**
 * Enhanced Structured Logger Service
 *
 * Pino-backed logger with context propagation, correlation IDs,
 * per-namespace log levels, sensitive field redaction,
 * and configurable adapters. Console output is always enabled;
 * additional adapters can be provided per deployment target.
 */

import { injectable, inject, optional } from 'inversify';
import pino from 'pino';
import { ConfigService } from '../shared/config/config.service';
import type { LogAdapter } from './log.adapter';
import type { LogEntry, LogLevel, LoggingConfig, NamespaceLevelConfig } from './log.types';
import { LOG_LEVEL_SEVERITY, LOGGING_CONFIG } from './log.types';
import { LogContext } from './log-context';
import { parseNamespaceLevels, resolveNamespaceLevel } from './namespace-levels';
import { buildRedactPaths } from './redaction';
import { createPinoInstance, CRUZ_TO_PINO_LEVEL } from './pino-factory';
import { dispatchToAdapters } from './adapters/log-adapter-destination';

export const LOG_ADAPTER = Symbol.for('LOG_ADAPTER');

@injectable()
export class Logger {
  private baseContext: Record<string, unknown> = {};
  private correlationId?: string;
  private source?: string;
  private readonly minLevel: LogLevel;
  private readonly isProduction: boolean;
  private readonly adapters: LogAdapter[] = [];
  private readonly namespaceLevels: NamespaceLevelConfig[];
  private readonly pinoInstance: pino.Logger;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService,
    @inject(LOGGING_CONFIG) @optional() loggingConfig?: LoggingConfig,
  ) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.isProduction = nodeEnv === 'production';
    this.minLevel = (this.configService.get<string>('LOG_LEVEL', this.isProduction ? 'info' : 'debug') as LogLevel) ?? 'debug';

    // Parse namespace levels from env
    this.namespaceLevels = parseNamespaceLevels(
      this.configService.get<string>('LOG_LEVELS', undefined),
    );

    // Build redaction paths: defaults + env overrides + programmatic config
    const redactPaths = buildRedactPaths(
      this.configService.get<string>('LOG_REDACT_PATHS', undefined),
      loggingConfig?.redactPaths,
    );

    // Detect Cloudflare Workers edge runtime
    const isEdge = typeof (globalThis as Record<string, unknown>).HTMLRewriter === 'function';

    // Resolve transport: env vars take precedence over programmatic config
    const transportTarget = this.configService.get<string>('LOG_TRANSPORT', undefined);
    const transportOptionsRaw = this.configService.get<string>('LOG_TRANSPORT_OPTIONS', undefined);
    let transport = loggingConfig?.transport;
    if (transportTarget) {
      let transportOptions: Record<string, unknown> | undefined;
      if (transportOptionsRaw) {
        try { transportOptions = JSON.parse(transportOptionsRaw); } catch { /* ignore */ }
      }
      transport = { target: transportTarget, options: transportOptions };
    }

    this.pinoInstance = createPinoInstance(
      this.isProduction,
      isEdge,
      this.minLevel,
      redactPaths,
      transport,
    );
  }

  /**
   * Register an external log adapter for multi-channel dispatch.
   */
  addAdapter(adapter: LogAdapter): void {
    this.adapters.push(adapter);
  }

  /**
   * Create a child logger with additional merged context.
   */
  withContext(ctx: Record<string, unknown>): Logger {
    const child = this.createChild();
    child.baseContext = { ...this.baseContext, ...ctx };
    return child;
  }

  /**
   * Create a child logger with a correlation ID set.
   */
  withCorrelationId(id: string): Logger {
    const child = this.createChild();
    child.correlationId = id;
    return child;
  }

  /**
   * Create a child logger with a source label (e.g. class name).
   * Applies per-namespace log level if configured.
   */
  withSource(source: string): Logger {
    const child = this.createChild();
    child.source = source;
    return child;
  }

  /**
   * Set context on this logger instance (mutates in place).
   */
  setContext(context: Record<string, unknown>): void {
    this.baseContext = { ...this.baseContext, ...context };
  }

  /**
   * Clear context on this logger instance.
   */
  clearContext(): void {
    this.baseContext = {};
  }

  // ── Level Methods ──────────────────────────────────────────────────────

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warning(message: string, context?: Record<string, unknown>): void {
    this.log('warning', message, context);
  }

  /** Backward-compatible alias for `warning()` */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warning', message, context);
  }

  error(message: string, errorOrContext?: Error | unknown, context?: Record<string, unknown>): void {
    let mergedContext = context ?? {};
    if (errorOrContext instanceof Error) {
      mergedContext = {
        ...mergedContext,
        error: {
          name: errorOrContext.name,
          message: errorOrContext.message,
          stack: errorOrContext.stack,
        },
      };
    } else if (errorOrContext !== undefined && !(errorOrContext instanceof Error)) {
      if (typeof errorOrContext === 'object' && errorOrContext !== null && !Array.isArray(errorOrContext)) {
        mergedContext = { ...mergedContext, ...(errorOrContext as Record<string, unknown>) };
      } else {
        mergedContext = { ...mergedContext, error: errorOrContext };
      }
    }
    this.log('error', message, mergedContext);
  }

  critical(message: string, context?: Record<string, unknown>): void {
    this.log('critical', message, context);
  }

  // ── Core ───────────────────────────────────────────────────────────────

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Resolve effective level for this source
    const effectiveMinLevel = resolveNamespaceLevel(this.source, this.namespaceLevels, this.minLevel);
    if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[effectiveMinLevel]) {
      return;
    }

    // Merge contexts: base + LogContext (AsyncLocalStorage) + explicit
    const alsStore = LogContext.getStore();
    const mergedContext: Record<string, unknown> = {
      ...this.baseContext,
      ...context,
    };

    // Build the log entry for adapters
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
      correlationId: this.correlationId ?? alsStore?.requestId,
      source: this.source,
    };

    // Build Pino log object
    const pinoObj: Record<string, unknown> = {};
    if (entry.source) pinoObj.source = entry.source;
    if (entry.correlationId) pinoObj.requestId = entry.correlationId;
    if (alsStore?.userId) pinoObj.userId = alsStore.userId;
    if (alsStore?.orgId) pinoObj.orgId = alsStore.orgId;
    if (alsStore?.traceId) pinoObj.traceId = alsStore.traceId;
    if (alsStore?.spanId) pinoObj.spanId = alsStore.spanId;
    if (entry.context) pinoObj.context = entry.context;

    // Dispatch to Pino
    const pinoMethod = CRUZ_TO_PINO_LEVEL[level] ?? 'info';
    ((this.pinoInstance as unknown) as Record<string, (...a: unknown[]) => void>)[pinoMethod](pinoObj, message);

    // Dispatch to legacy adapters
    dispatchToAdapters(this.adapters, entry);
  }

  /**
   * Flush all adapters that support buffered output.
   */
  async flush(): Promise<void> {
    await Promise.allSettled(
      this.adapters
        .filter((a) => typeof a.flush === 'function')
        .map((a) => a.flush!()),
    );
  }

  // ── Private ────────────────────────────────────────────────────────────

  // Child loggers share the parent's Pino instance, adapters, config, and namespace levels.
  // Only baseContext, correlationId, and source are forked per child.
  private createChild(): Logger {
    const child = Object.create(Logger.prototype) as Logger;
    Object.assign(child, {
      baseContext: { ...this.baseContext },
      correlationId: this.correlationId,
      source: this.source,
      minLevel: this.minLevel,
      isProduction: this.isProduction,
      adapters: this.adapters,       // shared reference — adapters propagate to children
      namespaceLevels: this.namespaceLevels,
      pinoInstance: this.pinoInstance,
    });
    return child;
  }
}
