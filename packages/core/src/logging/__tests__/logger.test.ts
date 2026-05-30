/**
 * Structured Logging — Unit Tests
 *
 * Covers: log level filtering, context propagation, correlation IDs,
 * adapter dispatch, correlation ID middleware, LogContext, namespace levels,
 * and redaction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../logger.service';
import { JsonLogFormatter } from '../formatters/json.formatter';
import { PrettyLogFormatter } from '../formatters/pretty.formatter';
import { generateCorrelationId, createRequestLogger, getCorrelationId } from '../logging.middleware';
import { LogContext } from '../log-context';
import { parseNamespaceLevels, resolveNamespaceLevel } from '../namespace-levels';
import { buildRedactPaths } from '../redaction';
import type { LogAdapter } from '../log.adapter';
import type { LogEntry } from '../log.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        ...overrides,
      };
      return values[key] ?? defaultValue;
    }),
    getOrThrow: vi.fn(),
    getEnv: vi.fn(),
    getRaw: vi.fn(),
  } as any;
}

function createLogger(overrides: Record<string, unknown> = {}): Logger {
  const config = createMockConfigService(overrides);
  return new Logger(config);
}

function createMockAdapter(): LogAdapter & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    log: vi.fn(async (entry: LogEntry) => {
      entries.push(entry);
    }),
    flush: vi.fn(async () => {}),
  };
}

// Silence Pino output during tests
let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Silence Pino's stdout writes during tests
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy?.mockRestore();
  });

  describe('log level filtering', () => {
    it('should filter out messages below the minimum level', () => {
      const adapter = createMockAdapter();
      const logger = createLogger({ LOG_LEVEL: 'info' });
      logger.addAdapter(adapter);
      logger.debug('should not appear');
      expect(adapter.entries).toHaveLength(0);
    });

    it('should allow messages at or above the minimum level', () => {
      const adapter = createMockAdapter();
      const logger = createLogger({ LOG_LEVEL: 'info' });
      logger.addAdapter(adapter);
      logger.info('should appear');
      expect(adapter.entries).toHaveLength(1);
    });

    it('should allow all levels when minimum is debug', () => {
      const adapter = createMockAdapter();
      const logger = createLogger({ LOG_LEVEL: 'debug' });
      logger.addAdapter(adapter);
      logger.debug('debug msg');
      logger.critical('critical msg');
      expect(adapter.entries).toHaveLength(2);
    });

    it('should only allow critical when minimum is critical', () => {
      const adapter = createMockAdapter();
      const logger = createLogger({ LOG_LEVEL: 'critical' });
      logger.addAdapter(adapter);
      logger.warning('filtered');
      logger.error('filtered');
      logger.critical('allowed');
      expect(adapter.entries).toHaveLength(1);
      expect(adapter.entries[0].level).toBe('critical');
    });
  });

  describe('context propagation via withContext', () => {
    it('should create a child logger with merged context', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      const child = logger.withContext({ service: 'auth' });
      child.info('test');
      expect(adapter.entries).toHaveLength(1);
      expect(adapter.entries[0].context).toEqual({ service: 'auth' });
    });

    it('should merge parent and child contexts', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      logger.setContext({ app: 'cruzjs' });
      const child = logger.withContext({ service: 'auth' });
      child.info('test');
      expect(adapter.entries[0].context).toEqual({ app: 'cruzjs', service: 'auth' });
    });

    it('should not modify the parent logger context', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      const child = logger.withContext({ service: 'auth' });
      child.info('child msg');
      logger.info('parent msg');
      expect(adapter.entries[0].context).toEqual({ service: 'auth' });
      expect(adapter.entries[1].context).toBeUndefined();
    });
  });

  describe('correlation ID', () => {
    it('should set correlation ID via withCorrelationId', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      const child = logger.withCorrelationId('abc-123');
      child.info('traced');
      expect(adapter.entries[0].correlationId).toBe('abc-123');
    });

    it('should propagate correlation ID to child loggers', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      const child = logger.withCorrelationId('abc-123').withContext({ extra: true });
      child.info('traced with context');
      expect(adapter.entries[0].correlationId).toBe('abc-123');
      expect(adapter.entries[0].context).toEqual({ extra: true });
    });
  });

  describe('source', () => {
    it('should set source via withSource', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      const child = logger.withSource('AuthService');
      child.info('auth action');
      expect(adapter.entries[0].source).toBe('AuthService');
    });
  });

  describe('adapter dispatch', () => {
    it('should dispatch to all registered adapters', () => {
      const adapter1 = createMockAdapter();
      const adapter2 = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter1);
      logger.addAdapter(adapter2);
      logger.info('hello');
      expect(adapter1.entries).toHaveLength(1);
      expect(adapter2.entries).toHaveLength(1);
    });

    it('should not crash if adapter throws', () => {
      const badAdapter: LogAdapter = {
        log: vi.fn(async () => { throw new Error('boom'); }),
      };
      const logger = createLogger();
      logger.addAdapter(badAdapter);
      expect(() => logger.info('hello')).not.toThrow();
    });
  });

  describe('flush', () => {
    it('should flush all adapters', async () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      await logger.flush();
      expect(adapter.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('backward compatibility', () => {
    it('should support warn() as alias for warning()', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      logger.warn('old-style warning');
      expect(adapter.entries[0].level).toBe('warning');
    });

    it('should support error() with Error object', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      const err = new Error('test error');
      logger.error('something failed', err);
      expect(adapter.entries[0].context?.error).toEqual({
        name: 'Error',
        message: 'test error',
        stack: expect.any(String),
      });
    });

    it('should support setContext/clearContext', () => {
      const adapter = createMockAdapter();
      const logger = createLogger();
      logger.addAdapter(adapter);
      logger.setContext({ requestId: '42' });
      logger.info('with context');
      logger.clearContext();
      logger.info('without context');
      expect(adapter.entries[0].context).toEqual({ requestId: '42' });
      expect(adapter.entries[1].context).toBeUndefined();
    });
  });
});

// Keep formatter tests as-is since formatters are preserved
describe('JsonLogFormatter', () => {
  const formatter = new JsonLogFormatter();

  it('should output valid JSON', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'test',
      timestamp: '2026-03-15T12:00:00.000Z',
    };
    const result = formatter.format(entry);
    const parsed = JSON.parse(result);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test');
  });

  it('should include correlationId when present', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'test',
      timestamp: '2026-03-15T12:00:00.000Z',
      correlationId: 'abc-123',
    };
    const parsed = JSON.parse(formatter.format(entry));
    expect(parsed.correlationId).toBe('abc-123');
  });

  it('should include source when present', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'test',
      timestamp: '2026-03-15T12:00:00.000Z',
      source: 'AuthService',
    };
    const parsed = JSON.parse(formatter.format(entry));
    expect(parsed.source).toBe('AuthService');
  });

  it('should include context when non-empty', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'test',
      timestamp: '2026-03-15T12:00:00.000Z',
      context: { userId: '123' },
    };
    const parsed = JSON.parse(formatter.format(entry));
    expect(parsed.context).toEqual({ userId: '123' });
  });

  it('should omit context when empty', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'test',
      timestamp: '2026-03-15T12:00:00.000Z',
      context: {},
    };
    const parsed = JSON.parse(formatter.format(entry));
    expect(parsed.context).toBeUndefined();
  });
});

describe('PrettyLogFormatter', () => {
  const formatter = new PrettyLogFormatter();

  it('should include level label and message', () => {
    const entry: LogEntry = {
      level: 'info',
      message: 'hello world',
      timestamp: '2026-03-15T12:00:00.000Z',
    };
    const result = formatter.format(entry);
    expect(result).toContain('[INFO]');
    expect(result).toContain('hello world');
  });

  it('should include source when present', () => {
    const entry: LogEntry = {
      level: 'warning',
      message: 'watch out',
      timestamp: '2026-03-15T12:00:00.000Z',
      source: 'CacheService',
    };
    const result = formatter.format(entry);
    expect(result).toContain('[CacheService]');
    expect(result).toContain('[WARN]');
  });

  it('should include shortened correlation ID', () => {
    const entry: LogEntry = {
      level: 'debug',
      message: 'trace',
      timestamp: '2026-03-15T12:00:00.000Z',
      correlationId: 'abcdefgh-1234-5678',
    };
    const result = formatter.format(entry);
    expect(result).toContain('(abcdefgh)');
  });

  it('should include context as indented JSON', () => {
    const entry: LogEntry = {
      level: 'error',
      message: 'failed',
      timestamp: '2026-03-15T12:00:00.000Z',
      context: { code: 500 },
    };
    const result = formatter.format(entry);
    expect(result).toContain('"code": 500');
  });
});

describe('Correlation ID middleware', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a unique correlation ID', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should create a request logger with correlation ID', () => {
    const adapter = createMockAdapter();
    const logger = createLogger();
    logger.addAdapter(adapter);
    const requestLogger = createRequestLogger(logger);
    requestLogger.info('request processed');
    expect(adapter.entries[0].correlationId).toBeTruthy();
  });

  it('should use x-correlation-id header if present', () => {
    const adapter = createMockAdapter();
    const logger = createLogger();
    logger.addAdapter(adapter);
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-correlation-id': 'header-id-123' },
    });
    const requestLogger = createRequestLogger(logger, request);
    requestLogger.info('with header id');
    expect(adapter.entries[0].correlationId).toBe('header-id-123');
  });

  it('should use x-request-id header as fallback', () => {
    const adapter = createMockAdapter();
    const logger = createLogger();
    logger.addAdapter(adapter);
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-request-id': 'request-id-456' },
    });
    const requestLogger = createRequestLogger(logger, request);
    requestLogger.info('with request id');
    expect(adapter.entries[0].correlationId).toBe('request-id-456');
  });

  it('should extract correlation ID via getCorrelationId', () => {
    const request = new Request('http://localhost/', {
      headers: { 'x-correlation-id': 'my-id' },
    });
    expect(getCorrelationId(request)).toBe('my-id');
  });

  it('should generate ID when no header present via getCorrelationId', () => {
    const id = getCorrelationId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });
});

// ── New Feature Tests ─────────────────────────────────────────────────────

describe('LogContext', () => {
  it('should create isolated scope with run()', () => {
    let storeInside: any;
    LogContext.run({ requestId: 'req-1' }, () => {
      storeInside = LogContext.getStore();
    });
    expect(storeInside).toEqual({ requestId: 'req-1' });
    expect(LogContext.getStore()).toBeUndefined();
  });

  it('should set/get values within a scope', () => {
    LogContext.run({ requestId: 'req-2' }, () => {
      LogContext.set('userId', 'usr-1');
      expect(LogContext.get('userId')).toBe('usr-1');
      expect(LogContext.get('requestId')).toBe('req-2');
    });
  });

  it('should return undefined for get/set outside scope', () => {
    LogContext.set('key', 'value'); // no-op
    expect(LogContext.get('key')).toBeUndefined();
  });

  it('should maintain isolation between nested runs', async () => {
    const results: string[] = [];

    await Promise.all([
      new Promise<void>((resolve) => {
        LogContext.run({ requestId: 'a' }, () => {
          results.push(LogContext.get('requestId')!);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        LogContext.run({ requestId: 'b' }, () => {
          results.push(LogContext.get('requestId')!);
          resolve();
        });
      }),
    ]);

    expect(results).toContain('a');
    expect(results).toContain('b');
  });

  it('should auto-include LogContext in log entries', () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const adapter = createMockAdapter();
    const logger = createLogger();
    logger.addAdapter(adapter);

    LogContext.run({ requestId: 'ctx-req-1' }, () => {
      logger.info('inside context');
    });

    expect(adapter.entries[0].correlationId).toBe('ctx-req-1');
  });
});

describe('parseNamespaceLevels', () => {
  it('should parse valid input', () => {
    const result = parseNamespaceLevels('auth:debug,db:warning');
    expect(result).toEqual([
      { namespace: 'auth', level: 'debug' },
      { namespace: 'db', level: 'warning' },
    ]);
  });

  it('should handle empty/undefined input', () => {
    expect(parseNamespaceLevels(undefined)).toEqual([]);
    expect(parseNamespaceLevels('')).toEqual([]);
    expect(parseNamespaceLevels('  ')).toEqual([]);
  });

  it('should ignore invalid levels', () => {
    const result = parseNamespaceLevels('auth:debug,db:invalid,trpc:info');
    expect(result).toEqual([
      { namespace: 'auth', level: 'debug' },
      { namespace: 'trpc', level: 'info' },
    ]);
  });

  it('should handle whitespace', () => {
    const result = parseNamespaceLevels(' auth : debug , db : info ');
    expect(result).toEqual([
      { namespace: 'auth', level: 'debug' },
      { namespace: 'db', level: 'info' },
    ]);
  });
});

describe('resolveNamespaceLevel', () => {
  const levels = [
    { namespace: 'auth', level: 'debug' as const },
    { namespace: 'db', level: 'warning' as const },
  ];

  it('should match exact namespace', () => {
    expect(resolveNamespaceLevel('auth', levels, 'info')).toBe('debug');
    expect(resolveNamespaceLevel('db', levels, 'info')).toBe('warning');
  });

  it('should match hierarchical namespace', () => {
    expect(resolveNamespaceLevel('auth.oauth', levels, 'info')).toBe('debug');
    expect(resolveNamespaceLevel('auth.oauth.google', levels, 'info')).toBe('debug');
  });

  it('should fallback to global level for unknown namespace', () => {
    expect(resolveNamespaceLevel('unknown', levels, 'info')).toBe('info');
  });

  it('should fallback when source is undefined', () => {
    expect(resolveNamespaceLevel(undefined, levels, 'info')).toBe('info');
  });

  it('should fallback when no namespace levels configured', () => {
    expect(resolveNamespaceLevel('auth', [], 'info')).toBe('info');
  });
});

describe('buildRedactPaths', () => {
  it('should return defaults when no env', () => {
    const paths = buildRedactPaths(undefined);
    expect(paths).toContain('password');
    expect(paths).toContain('token');
    expect(paths).toContain('secret');
  });

  it('should merge env paths with defaults', () => {
    const paths = buildRedactPaths('apiKey,privateKey');
    expect(paths).toContain('password');
    expect(paths).toContain('apiKey');
    expect(paths).toContain('privateKey');
  });

  it('should deduplicate paths', () => {
    const paths = buildRedactPaths('password,token');
    const passwordCount = paths.filter(p => p === 'password').length;
    expect(passwordCount).toBe(1);
  });
});

describe('Logger with namespace levels', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should filter by namespace level', () => {
    const adapter = createMockAdapter();
    const logger = createLogger({ LOG_LEVEL: 'debug', LOG_LEVELS: 'db:warning' });
    logger.addAdapter(adapter);

    const dbLogger = logger.withSource('db');
    dbLogger.debug('should be filtered');
    dbLogger.info('should be filtered');
    dbLogger.warning('should appear');

    expect(adapter.entries).toHaveLength(1);
    expect(adapter.entries[0].message).toBe('should appear');
  });
});
