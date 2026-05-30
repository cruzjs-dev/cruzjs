/**
 * Logging Module
 *
 * Provides the Pino-backed Logger service, LogContext for automatic
 * context propagation, and LOGGER_FACTORY for child logger creation.
 */

import { Module } from '../di';
import { Logger } from './logger.service';
import { LOGGER_FACTORY, LOGGING_CONFIG } from './log.types';
import type { LoggingConfig } from './log.types';

const DEFAULT_LOGGING_CONFIG: LoggingConfig = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerFactory = (logger: any) => (source: string) => (logger as Logger).withSource(source);

@Module({
  providers: [
    Logger,
    {
      provide: LOGGING_CONFIG,
      useValue: DEFAULT_LOGGING_CONFIG,
    },
    {
      provide: LOGGER_FACTORY,
      useFactory: loggerFactory,
      inject: [Logger],
    },
  ],
})
export class LoggingModule {
  /**
   * Configure logging with custom options.
   * Returns a module class with the config registered in the DI container.
   *
   * @example
   * LoggingModule.forRoot({
   *   redactPaths: ['apiKey'],
   *   transport: { target: 'pino-loki', options: { host: 'http://loki:3100' } },
   * })
   */
  static forRoot(config: LoggingConfig): typeof LoggingModule {
    @Module({
      providers: [
        Logger,
        { provide: LOGGING_CONFIG, useValue: config },
        {
          provide: LOGGER_FACTORY,
          useFactory: loggerFactory,
          inject: [Logger],
        },
      ],
    })
    class ConfiguredLoggingModule {}
    return ConfiguredLoggingModule as unknown as typeof LoggingModule;
  }
}
