/**
 * Error Reporting Module
 *
 * Opt-in module for error reporting. Provides the ErrorReportingService
 * with a default ConsoleErrorReporterAdapter. Platform-specific adapters
 * can override the ERROR_REPORTER_ADAPTER token via RuntimeAdapter bindings.
 *
 * Usage:
 * ```typescript
 * import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, ErrorReportingModule],
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */

import { Module } from '@cruzjs/core/di';
import { ErrorReportingService } from './error-reporting.service';
import { ConsoleErrorReporterAdapter } from './adapters/console.adapter';
import { ERROR_REPORTER_ADAPTER } from './error-reporting.types';

@Module({
  providers: [
    ErrorReportingService,
    {
      provide: ERROR_REPORTER_ADAPTER,
      useFactory: () => new ConsoleErrorReporterAdapter(),
    },
  ],
})
export class ErrorReportingModule {}
