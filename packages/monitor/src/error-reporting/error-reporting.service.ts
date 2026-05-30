/**
 * Error Reporting Service
 *
 * Central service for capturing and reporting errors with rich context.
 * Maintains breadcrumb trails, user/org context, and delegates to an
 * ErrorReporterAdapter for actual delivery (Sentry, console, etc.).
 *
 * Falls back to ConsoleErrorReporterAdapter when no adapter is provided.
 */

import { Injectable, Inject, Optional } from '@cruzjs/core/di';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import type { ErrorReporterAdapter } from './error-reporting.adapter';
import { ConsoleErrorReporterAdapter } from './adapters/console.adapter';
import {
  ERROR_REPORTER_ADAPTER,
  ErrorSeverity,
  type Breadcrumb,
  type CapturedError,
  type ErrorContext,
} from './error-reporting.types';

const MAX_BREADCRUMBS = 100;

@Injectable()
export class ErrorReportingService {
  private readonly breadcrumbs: Breadcrumb[] = [];
  private userContext: ErrorContext['user'] | null = null;
  private orgContext: ErrorContext['org'] | null = null;
  private readonly release: string | undefined;
  private readonly environment: string;
  private readonly adapter: ErrorReporterAdapter;

  constructor(
    @Inject(ERROR_REPORTER_ADAPTER) @Optional() adapter?: ErrorReporterAdapter | null,
    @Inject(ConfigService) @Optional() config?: ConfigService,
  ) {
    this.adapter = adapter ?? new ConsoleErrorReporterAdapter();
    this.release = config?.get<string>('APP_VERSION') ?? undefined;
    this.environment = config?.get<string>('NODE_ENV', 'development') ?? 'development';
  }

  /**
   * Capture an error with current context.
   * Returns a unique error ID for reference.
   */
  async capture(
    error: Error,
    options?: {
      severity?: ErrorSeverity;
      context?: Partial<ErrorContext>;
      fingerprint?: string[];
    },
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const severity = options?.severity ?? ErrorSeverity.ERROR;
    const context = this.buildContext(options?.context);

    const captured: CapturedError = {
      id: errorId,
      error,
      severity,
      context,
      fingerprint: options?.fingerprint ?? this.generateFingerprint(error),
      release: this.release,
      environment: this.environment,
      timestamp: new Date(),
    };

    try {
      await this.adapter.capture(captured);
    } catch {
      // Never let error reporting itself throw
    }

    return errorId;
  }

  /**
   * Capture a plain message (non-exception event).
   */
  async captureMessage(message: string, severity?: ErrorSeverity): Promise<void> {
    const resolvedSeverity = severity ?? ErrorSeverity.INFO;
    const context = this.buildContext();

    try {
      await this.adapter.captureMessage(message, resolvedSeverity, context);
    } catch {
      // Never let error reporting itself throw
    }
  }

  /**
   * Set user context for subsequent captures.
   * Pass null to clear user context.
   */
  setUser(user: ErrorContext['user'] | null): void {
    this.userContext = user;
  }

  /**
   * Set org context for subsequent captures.
   * Pass null to clear org context.
   */
  setOrg(org: ErrorContext['org'] | null): void {
    this.orgContext = org;
  }

  /**
   * Add a breadcrumb to the trail.
   * Breadcrumbs are capped at 100; oldest are dropped first.
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date(),
    });

    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.splice(0, this.breadcrumbs.length - MAX_BREADCRUMBS);
    }
  }

  /**
   * Clear all breadcrumbs.
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs.length = 0;
  }

  /**
   * Generate a stable fingerprint for error grouping.
   * Uses the error name + first line of the stack trace for deduplication.
   */
  generateFingerprint(error: Error): string[] {
    const parts: string[] = [error.name, error.message];

    if (error.stack) {
      const lines = error.stack.split('\n');
      // Use the first stack frame (line after error message) for grouping
      const firstFrame = lines.find((line) => line.trim().startsWith('at '));
      if (firstFrame) {
        parts.push(firstFrame.trim());
      }
    }

    return parts;
  }

  /**
   * Flush any pending events to the reporting backend.
   */
  async flush(): Promise<void> {
    try {
      await this.adapter.flush();
    } catch {
      // Never let error reporting itself throw
    }
  }

  /**
   * Get the underlying adapter (for advanced use cases or testing).
   */
  getAdapter(): ErrorReporterAdapter {
    return this.adapter;
  }

  // ── Private ─────────────────────────────────────────────────────────

  private buildContext(extra?: Partial<ErrorContext>): ErrorContext {
    const context: ErrorContext = {};

    // Merge user context
    if (this.userContext || extra?.user) {
      context.user = { ...this.userContext, ...extra?.user } as ErrorContext['user'];
    }

    // Merge org context
    if (this.orgContext || extra?.org) {
      context.org = { ...this.orgContext, ...extra?.org } as ErrorContext['org'];
    }

    // Merge request
    if (extra?.request) {
      context.request = extra.request;
    }

    // Merge tags
    if (extra?.tags) {
      context.tags = extra.tags;
    }

    // Merge extra data
    if (extra?.extra) {
      context.extra = extra.extra;
    }

    // Attach breadcrumbs (copy current trail)
    if (this.breadcrumbs.length > 0 || (extra?.breadcrumbs && extra.breadcrumbs.length > 0)) {
      context.breadcrumbs = [...this.breadcrumbs, ...(extra?.breadcrumbs ?? [])];
    }

    return context;
  }

  private generateErrorId(): string {
    return crypto.randomUUID();
  }
}
