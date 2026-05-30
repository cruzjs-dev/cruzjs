/**
 * Error Reporting Unit Tests
 *
 * Tests for the ErrorReportingService, adapters, and middleware.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorReportingService } from '../error-reporting.service';
import { ConsoleErrorReporterAdapter } from '../adapters/console.adapter';
import { SentryErrorReporterAdapter } from '../adapters/sentry.adapter';
import { errorReportingMiddleware } from '../error-reporting.middleware';
import { ErrorSeverity } from '../error-reporting.types';
import type { ErrorReporterAdapter } from '../error-reporting.adapter';
import type { CapturedError, ErrorContext } from '../error-reporting.types';
import { TRPCError } from '@trpc/server';

// ─── Mock Adapter ────────────────────────────────────────────────────────────

function createMockAdapter(): ErrorReporterAdapter & {
  capturedErrors: CapturedError[];
  capturedMessages: Array<{ message: string; severity: string; context?: ErrorContext }>;
} {
  const capturedErrors: CapturedError[] = [];
  const capturedMessages: Array<{ message: string; severity: string; context?: ErrorContext }> = [];

  return {
    name: 'mock',
    capturedErrors,
    capturedMessages,
    capture: vi.fn(async (error: CapturedError) => {
      capturedErrors.push(error);
    }),
    captureMessage: vi.fn(async (message: string, severity: string, context?: ErrorContext) => {
      capturedMessages.push({ message, severity, context });
    }),
    flush: vi.fn(async () => {}),
    isAvailable: vi.fn(() => true),
  };
}

function createService(adapter?: ErrorReporterAdapter): ErrorReportingService {
  return new (ErrorReportingService as any)(adapter ?? null, null) as ErrorReportingService;
}

// ─── ErrorReportingService ───────────────────────────────────────────────────

describe('ErrorReportingService', () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let service: ErrorReportingService;

  beforeEach(() => {
    adapter = createMockAdapter();
    service = createService(adapter);
  });

  describe('capture', () => {
    it('should send error to adapter', async () => {
      const error = new Error('test error');
      const errorId = await service.capture(error);

      expect(errorId).toBeTruthy();
      expect(adapter.capture).toHaveBeenCalledTimes(1);
      expect(adapter.capturedErrors).toHaveLength(1);
      expect(adapter.capturedErrors[0].error).toBe(error);
      expect(adapter.capturedErrors[0].severity).toBe(ErrorSeverity.ERROR);
    });

    it('should include breadcrumbs in captured error', async () => {
      service.addBreadcrumb({
        category: 'navigation',
        message: 'Navigated to /dashboard',
        level: ErrorSeverity.INFO,
      });
      service.addBreadcrumb({
        category: 'http',
        message: 'GET /api/users',
        level: ErrorSeverity.INFO,
      });

      await service.capture(new Error('test'));

      const captured = adapter.capturedErrors[0];
      expect(captured.context.breadcrumbs).toHaveLength(2);
      expect(captured.context.breadcrumbs![0].category).toBe('navigation');
      expect(captured.context.breadcrumbs![1].category).toBe('http');
    });

    it('should attach user context', async () => {
      service.setUser({ id: 'user-123', email: 'test@example.com' });

      await service.capture(new Error('test'));

      const captured = adapter.capturedErrors[0];
      expect(captured.context.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should attach org context', async () => {
      service.setOrg({ id: 'org-456', slug: 'my-org' });

      await service.capture(new Error('test'));

      const captured = adapter.capturedErrors[0];
      expect(captured.context.org).toEqual({
        id: 'org-456',
        slug: 'my-org',
      });
    });

    it('should use specified severity', async () => {
      await service.capture(new Error('fatal'), { severity: ErrorSeverity.FATAL });

      expect(adapter.capturedErrors[0].severity).toBe(ErrorSeverity.FATAL);
    });

    it('should use custom fingerprint when provided', async () => {
      const fingerprint = ['custom', 'grouping'];
      await service.capture(new Error('test'), { fingerprint });

      expect(adapter.capturedErrors[0].fingerprint).toEqual(fingerprint);
    });

    it('should not throw even if adapter throws', async () => {
      const failingAdapter: ErrorReporterAdapter = {
        name: 'failing',
        capture: vi.fn().mockRejectedValue(new Error('adapter failure')),
        captureMessage: vi.fn(),
        flush: vi.fn(),
        isAvailable: vi.fn(() => true),
      };

      const failService = createService(failingAdapter);
      const errorId = await failService.capture(new Error('test'));

      expect(errorId).toBeTruthy();
    });
  });

  describe('captureMessage', () => {
    it('should send message to adapter', async () => {
      await service.captureMessage('Something happened');

      expect(adapter.captureMessage).toHaveBeenCalledTimes(1);
      expect(adapter.capturedMessages).toHaveLength(1);
      expect(adapter.capturedMessages[0].message).toBe('Something happened');
      expect(adapter.capturedMessages[0].severity).toBe(ErrorSeverity.INFO);
    });

    it('should use specified severity for message', async () => {
      await service.captureMessage('Warning!', ErrorSeverity.WARNING);

      expect(adapter.capturedMessages[0].severity).toBe(ErrorSeverity.WARNING);
    });
  });

  describe('addBreadcrumb', () => {
    it('should accumulate breadcrumbs up to max 100', () => {
      for (let i = 0; i < 110; i++) {
        service.addBreadcrumb({
          category: 'test',
          message: `breadcrumb-${i}`,
          level: ErrorSeverity.INFO,
        });
      }

      // Capture to inspect breadcrumbs
      service.capture(new Error('test'));
      const captured = adapter.capturedErrors[0];
      expect(captured.context.breadcrumbs).toHaveLength(100);
      // Oldest should have been dropped; first breadcrumb should be #10
      expect(captured.context.breadcrumbs![0].message).toBe('breadcrumb-10');
    });
  });

  describe('clearBreadcrumbs', () => {
    it('should empty the breadcrumb list', async () => {
      service.addBreadcrumb({
        category: 'test',
        message: 'crumb',
        level: ErrorSeverity.INFO,
      });
      service.clearBreadcrumbs();

      await service.capture(new Error('test'));

      const captured = adapter.capturedErrors[0];
      expect(captured.context.breadcrumbs).toBeUndefined();
    });
  });

  describe('generateFingerprint', () => {
    it('should produce stable fingerprint', () => {
      const error = new Error('test error');
      const fp1 = service.generateFingerprint(error);
      const fp2 = service.generateFingerprint(error);

      expect(fp1).toEqual(fp2);
      expect(fp1[0]).toBe('Error');
      expect(fp1[1]).toBe('test error');
    });

    it('should include first stack frame when available', () => {
      const error = new Error('stack test');
      const fp = service.generateFingerprint(error);

      // Should have 3 parts: name, message, first stack frame
      expect(fp.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('setUser / setOrg', () => {
    it('should clear user context when null is passed', async () => {
      service.setUser({ id: 'user-1' });
      service.setUser(null);

      await service.capture(new Error('test'));

      expect(adapter.capturedErrors[0].context.user).toBeUndefined();
    });

    it('should clear org context when null is passed', async () => {
      service.setOrg({ id: 'org-1' });
      service.setOrg(null);

      await service.capture(new Error('test'));

      expect(adapter.capturedErrors[0].context.org).toBeUndefined();
    });
  });

  describe('flush', () => {
    it('should delegate to adapter flush', async () => {
      await service.flush();

      expect(adapter.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback to console adapter', () => {
    it('should use ConsoleErrorReporterAdapter when no adapter provided', () => {
      const fallbackService = createService();
      const underlyingAdapter = fallbackService.getAdapter();

      expect(underlyingAdapter.name).toBe('console');
      expect(underlyingAdapter).toBeInstanceOf(ConsoleErrorReporterAdapter);
    });
  });
});

// ─── ConsoleErrorReporterAdapter ─────────────────────────────────────────────

describe('ConsoleErrorReporterAdapter', () => {
  let adapter: ConsoleErrorReporterAdapter;

  beforeEach(() => {
    adapter = new ConsoleErrorReporterAdapter();
  });

  it('should log captured error to console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const captured: CapturedError = {
      id: 'err-123',
      error: new Error('test'),
      severity: ErrorSeverity.ERROR,
      context: {
        user: { id: 'user-1', email: 'test@test.com' },
        tags: { route: '/api/test' },
      },
      timestamp: new Date('2026-01-01T00:00:00Z'),
    };

    await adapter.capture(captured);

    expect(spy).toHaveBeenCalledTimes(1);
    const loggedStr = spy.mock.calls[0][1] as string;
    const logged = JSON.parse(loggedStr);
    expect(logged.errorId).toBe('err-123');
    expect(logged.severity).toBe('error');
    expect(logged.message).toBe('test');
    expect(logged.user.id).toBe('user-1');
    expect(logged.tags.route).toBe('/api/test');

    spy.mockRestore();
  });

  it('should always be available', () => {
    expect(adapter.isAvailable()).toBe(true);
  });
});

// ─── SentryErrorReporterAdapter ──────────────────────────────────────────────

describe('SentryErrorReporterAdapter', () => {
  const testDsn = 'https://abc123@o12345.ingest.sentry.io/67890';

  it('should build a valid envelope', () => {
    const adapter = new SentryErrorReporterAdapter(testDsn, {
      environment: 'test',
      release: '1.0.0',
    });

    const captured: CapturedError = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      error: new Error('sentry test'),
      severity: ErrorSeverity.ERROR,
      context: {
        user: { id: 'user-1', email: 'test@test.com' },
        org: { id: 'org-1', slug: 'acme' },
        tags: { component: 'api' },
        breadcrumbs: [
          {
            category: 'http',
            message: 'GET /api',
            level: ErrorSeverity.INFO,
            timestamp: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      },
      fingerprint: ['Error', 'sentry test'],
      release: '1.0.0',
      environment: 'test',
      timestamp: new Date('2026-01-01T00:00:00Z'),
    };

    const envelope = adapter.buildEnvelope(captured);
    const lines = envelope.split('\n');

    // Envelope has 3 lines: header, item header, item payload
    expect(lines).toHaveLength(3);

    // Parse each line
    const envelopeHeader = JSON.parse(lines[0]);
    expect(envelopeHeader.event_id).toBe('550e8400e29b41d4a716446655440000');
    expect(envelopeHeader.dsn).toBe(testDsn);

    const itemHeader = JSON.parse(lines[1]);
    expect(itemHeader.type).toBe('event');

    const event = JSON.parse(lines[2]);
    expect(event.level).toBe('error');
    expect(event.environment).toBe('test');
    expect(event.release).toBe('1.0.0');
    expect(event.exception.values[0].type).toBe('Error');
    expect(event.exception.values[0].value).toBe('sentry test');
    expect(event.user.id).toBe('user-1');
    expect(event.tags['org.id']).toBe('org-1');
    expect(event.tags['org.slug']).toBe('acme');
    expect(event.tags.component).toBe('api');
    expect(event.fingerprint).toEqual(['Error', 'sentry test']);
    expect(event.breadcrumbs.values).toHaveLength(1);
    expect(event.breadcrumbs.values[0].category).toBe('http');
  });

  it('should parse DSN correctly', () => {
    const adapter = new SentryErrorReporterAdapter(testDsn);
    const parsed = adapter.parseDsn(testDsn);

    expect(parsed.key).toBe('abc123');
    expect(parsed.host).toBe('o12345.ingest.sentry.io');
    expect(parsed.projectId).toBe('67890');
  });

  it('should handle invalid DSN gracefully', () => {
    const adapter = new SentryErrorReporterAdapter('not-a-url');
    expect(adapter.isAvailable()).toBe(false);
  });

  it('should report isAvailable as true for valid DSN', () => {
    const adapter = new SentryErrorReporterAdapter(testDsn);
    expect(adapter.isAvailable()).toBe(true);
  });
});

// ─── errorReportingMiddleware ────────────────────────────────────────────────

describe('errorReportingMiddleware', () => {
  it('should pass through successful results', async () => {
    const mockAdapter = createMockAdapter();
    const reporter = createService(mockAdapter);
    const middleware = errorReportingMiddleware(reporter);

    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const result = await middleware({ ctx: {}, next });

    expect(result).toEqual({ data: 'ok' });
    expect(mockAdapter.capture).not.toHaveBeenCalled();
  });

  it('should catch and report tRPC errors', async () => {
    const mockAdapter = createMockAdapter();
    const reporter = createService(mockAdapter);
    const middleware = errorReportingMiddleware(reporter);

    const trpcError = new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something broke',
    });
    const next = vi.fn().mockRejectedValue(trpcError);

    await expect(middleware({ ctx: {}, next })).rejects.toThrow(trpcError);
    expect(mockAdapter.capture).toHaveBeenCalledTimes(1);
    expect(mockAdapter.capturedErrors[0].error).toBe(trpcError);
    expect(mockAdapter.capturedErrors[0].severity).toBe(ErrorSeverity.ERROR);
  });

  it('should capture user and org context from tRPC ctx', async () => {
    const mockAdapter = createMockAdapter();
    const reporter = createService(mockAdapter);
    const middleware = errorReportingMiddleware(reporter);

    const ctx = {
      session: { user: { id: 'user-1', email: 'test@test.com' } },
      org: { orgId: 'org-1' },
      request: new Request('https://example.com/api/test', { method: 'POST' }),
    };

    const next = vi.fn().mockRejectedValue(new Error('ctx test'));

    await expect(middleware({ ctx, next })).rejects.toThrow('ctx test');

    const captured = mockAdapter.capturedErrors[0];
    expect(captured.context.user?.id).toBe('user-1');
    expect(captured.context.org?.id).toBe('org-1');
    expect(captured.context.request?.url).toContain('/api/test');
    expect(captured.context.request?.method).toBe('POST');
  });

  it('should treat non-INTERNAL_SERVER_ERROR as warnings', async () => {
    const mockAdapter = createMockAdapter();
    const reporter = createService(mockAdapter);
    const middleware = errorReportingMiddleware(reporter);

    const notFoundError = new TRPCError({
      code: 'NOT_FOUND',
      message: 'Item not found',
    });
    const next = vi.fn().mockRejectedValue(notFoundError);

    await expect(middleware({ ctx: {}, next })).rejects.toThrow(notFoundError);

    expect(mockAdapter.capturedErrors[0].severity).toBe(ErrorSeverity.WARNING);
  });

  it('should re-throw the original error', async () => {
    const mockAdapter = createMockAdapter();
    const reporter = createService(mockAdapter);
    const middleware = errorReportingMiddleware(reporter);

    const originalError = new Error('original');
    const next = vi.fn().mockRejectedValue(originalError);

    await expect(middleware({ ctx: {}, next })).rejects.toBe(originalError);
  });
});
