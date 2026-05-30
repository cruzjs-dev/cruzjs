import pino from 'pino';

export const CRUZ_TO_PINO_LEVEL: Record<string, string> = {
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  error: 'error',
  critical: 'fatal',
};

export function createPinoInstance(
  isProduction: boolean,
  isEdge: boolean,
  level: string,
  redactPaths: string[],
  transport?: { target: string; options?: Record<string, unknown> },
): pino.Logger {
  const pinoLevel = CRUZ_TO_PINO_LEVEL[level] ?? 'info';

  const options: pino.LoggerOptions = {
    level: pinoLevel,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  };

  // Edge runtime (Cloudflare Workers): use browser-style write
  if (isEdge) {
    return pino({
      ...options,
      browser: {
        write: {
          debug: (o: object) => console.debug(JSON.stringify(o)),
          info: (o: object) => console.info(JSON.stringify(o)),
          warn: (o: object) => console.warn(JSON.stringify(o)),
          error: (o: object) => console.error(JSON.stringify(o)),
          fatal: (o: object) => console.error(JSON.stringify(o)),
        },
      },
    });
  }

  // Development: use pino-pretty transport
  if (!isProduction && !transport) {
    try {
      return pino({
        ...options,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      });
    } catch {
      // pino-pretty not available, fall back to default
      return pino(options);
    }
  }

  // Production with custom transport
  if (transport) {
    return pino({
      ...options,
      transport: {
        target: transport.target,
        options: transport.options,
      },
    });
  }

  // Production default: JSON to stdout
  return pino(options);
}
