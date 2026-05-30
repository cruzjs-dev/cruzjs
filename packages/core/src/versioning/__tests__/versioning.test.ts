/**
 * API Versioning Unit Tests
 *
 * Tests for version negotiation, decorators, service, and middleware.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VersionNegotiator } from '../version.negotiator';
import { VersioningService } from '../versioning.service';
import { versionMiddleware, versionedProcedure, versionHeaders } from '../versioning.middleware';
import { Version, Deprecated, getVersionMetadata, isDeprecated, getDeprecatedSunsetDate } from '../versioning.decorators';
import { VersionStrategy, DEFAULT_VERSION_CONFIG } from '../versioning.types';
import type { ApiVersion, VersionConfig } from '../versioning.types';
import { TRPCError } from '@trpc/server';

// ─── VersionNegotiator ───────────────────────────────────────────────────────

describe('VersionNegotiator', () => {
  describe('header strategy', () => {
    let negotiator: VersionNegotiator;

    beforeEach(() => {
      negotiator = new VersionNegotiator({
        strategy: VersionStrategy.HEADER,
        supported: ['v1', 'v2'],
        current: 'v2',
        defaultVersion: 'v1',
        headerName: 'Accept-Version',
      });
    });

    it('should resolve version from header', () => {
      const request = new Request('https://example.com/api/users', {
        headers: { 'Accept-Version': 'v2' },
      });
      expect(negotiator.resolve(request)).toBe('v2');
    });

    it('should accept numeric header value', () => {
      const request = new Request('https://example.com/api/users', {
        headers: { 'Accept-Version': '2' },
      });
      expect(negotiator.resolve(request)).toBe('v2');
    });

    it('should fall back to default when no header is present', () => {
      const request = new Request('https://example.com/api/users');
      expect(negotiator.resolve(request)).toBe('v1');
    });

    it('should use custom header name', () => {
      const custom = new VersionNegotiator({
        strategy: VersionStrategy.HEADER,
        supported: ['v1'],
        current: 'v1',
        headerName: 'X-API-Version',
      });
      const request = new Request('https://example.com', {
        headers: { 'X-API-Version': 'v1' },
      });
      expect(custom.resolve(request)).toBe('v1');
    });
  });

  describe('URL path strategy', () => {
    let negotiator: VersionNegotiator;

    beforeEach(() => {
      negotiator = new VersionNegotiator({
        strategy: VersionStrategy.URL_PATH,
        supported: ['v1', 'v2', 'v3'],
        current: 'v3',
        defaultVersion: 'v1',
      });
    });

    it('should resolve version from URL path', () => {
      const request = new Request('https://example.com/api/v2/users');
      expect(negotiator.resolve(request)).toBe('v2');
    });

    it('should resolve version at the start of path', () => {
      const request = new Request('https://example.com/v3/items');
      expect(negotiator.resolve(request)).toBe('v3');
    });

    it('should fall back to default when no version in path', () => {
      const request = new Request('https://example.com/api/users');
      expect(negotiator.resolve(request)).toBe('v1');
    });
  });

  describe('query param strategy', () => {
    let negotiator: VersionNegotiator;

    beforeEach(() => {
      negotiator = new VersionNegotiator({
        strategy: VersionStrategy.QUERY_PARAM,
        supported: ['v1', 'v2'],
        current: 'v2',
        defaultVersion: 'v1',
        queryParam: 'version',
      });
    });

    it('should resolve version from query param', () => {
      const request = new Request('https://example.com/api/users?version=v2');
      expect(negotiator.resolve(request)).toBe('v2');
    });

    it('should accept numeric query param', () => {
      const request = new Request('https://example.com/api/users?version=2');
      expect(negotiator.resolve(request)).toBe('v2');
    });

    it('should fall back to default when no query param', () => {
      const request = new Request('https://example.com/api/users');
      expect(negotiator.resolve(request)).toBe('v1');
    });

    it('should use custom query param name', () => {
      const custom = new VersionNegotiator({
        strategy: VersionStrategy.QUERY_PARAM,
        supported: ['v1'],
        current: 'v1',
        queryParam: 'api_v',
      });
      const request = new Request('https://example.com?api_v=v1');
      expect(custom.resolve(request)).toBe('v1');
    });
  });

  describe('unsupported version rejection', () => {
    it('should throw for unsupported version', () => {
      const negotiator = new VersionNegotiator({
        strategy: VersionStrategy.HEADER,
        supported: ['v1'],
        current: 'v1',
      });
      const request = new Request('https://example.com', {
        headers: { 'Accept-Version': 'v99' },
      });
      expect(() => negotiator.resolve(request)).toThrow('API version "v99" is not supported');
    });
  });

  describe('deprecated version detection', () => {
    it('should detect deprecated versions', () => {
      const negotiator = new VersionNegotiator({
        strategy: VersionStrategy.HEADER,
        supported: ['v1', 'v2'],
        deprecated: ['v1'],
        current: 'v2',
      });
      expect(negotiator.isDeprecated('v1')).toBe(true);
      expect(negotiator.isDeprecated('v2')).toBe(false);
    });

    it('should return false for non-deprecated version', () => {
      const negotiator = new VersionNegotiator({
        strategy: VersionStrategy.HEADER,
        supported: ['v1'],
        current: 'v1',
      });
      expect(negotiator.isDeprecated('v1')).toBe(false);
    });
  });

  describe('sunset dates', () => {
    it('should store and retrieve sunset dates', () => {
      const negotiator = new VersionNegotiator({
        strategy: VersionStrategy.HEADER,
        supported: ['v1', 'v2'],
        deprecated: ['v1'],
        current: 'v2',
      });
      const sunsetDate = new Date('2026-06-01T00:00:00Z');
      negotiator.setSunsetDate('v1', sunsetDate);

      expect(negotiator.getSunsetDate('v1')).toEqual(sunsetDate);
      expect(negotiator.getSunsetDate('v2')).toBeUndefined();
    });
  });
});

// ─── VersioningService ───────────────────────────────────────────────────────

describe('VersioningService', () => {
  let service: VersioningService;

  beforeEach(() => {
    service = new VersioningService({
      supported: ['v1', 'v2'],
      deprecated: ['v1'],
      current: 'v2',
      defaultVersion: 'v1',
      strategy: VersionStrategy.HEADER,
    });
  });

  it('should resolve version from request', () => {
    const request = new Request('https://example.com', {
      headers: { 'Accept-Version': 'v2' },
    });
    expect(service.resolveVersion(request)).toBe('v2');
  });

  it('should register and retrieve versions', () => {
    service.registerVersion({
      version: 'v1',
      deprecated: true,
      sunsetDate: new Date('2026-06-01'),
      changelog: 'Initial version',
    });
    service.registerVersion({
      version: 'v2',
      deprecated: false,
      changelog: 'Added new endpoints',
    });

    const versions = service.getVersions();
    expect(versions).toHaveLength(2);

    const v1 = service.getVersion('v1');
    expect(v1?.deprecated).toBe(true);
    expect(v1?.sunsetDate).toEqual(new Date('2026-06-01'));

    const v2 = service.getVersion('v2');
    expect(v2?.deprecated).toBe(false);
  });

  it('should generate deprecation headers for deprecated version', () => {
    service.registerVersion({
      version: 'v1',
      deprecated: true,
      sunsetDate: new Date('2026-06-01T00:00:00Z'),
    });

    const headers = service.getResponseHeaders('v1');
    expect(headers['API-Version']).toBe('v1');
    expect(headers['Deprecation']).toBe('true');
    expect(headers['Sunset']).toBeDefined();
  });

  it('should not include deprecation headers for current version', () => {
    const headers = service.getResponseHeaders('v2');
    expect(headers['API-Version']).toBe('v2');
    expect(headers['Deprecation']).toBeUndefined();
    expect(headers['Sunset']).toBeUndefined();
  });

  it('should check if version is supported', () => {
    expect(service.isSupported('v1')).toBe(true);
    expect(service.isSupported('v2')).toBe(true);
    expect(service.isSupported('v99' as ApiVersion)).toBe(false);
  });

  it('should check if version is deprecated', () => {
    expect(service.isDeprecated('v1')).toBe(true);
    expect(service.isDeprecated('v2')).toBe(false);
  });
});

// ─── Decorators ──────────────────────────────────────────────────────────────

describe('Version Decorator', () => {
  it('should store version metadata on a class', () => {
    @Version('v2')
    class TestRouter {}

    const meta = getVersionMetadata(TestRouter);
    expect(meta).toBeDefined();
    expect(meta?.version).toBe('v2');
    expect(meta?.deprecated).toBe(false);
  });

  it('should store version metadata on a method', () => {
    class TestRouter {
      @Version('v3')
      list() {}
    }

    const instance = new TestRouter();
    const meta = getVersionMetadata(instance, 'list');
    expect(meta).toBeDefined();
    expect(meta?.version).toBe('v3');
  });

  it('should return undefined when no version metadata', () => {
    class TestRouter {
      list() {}
    }

    const meta = getVersionMetadata(TestRouter);
    expect(meta).toBeUndefined();
  });
});

describe('Deprecated Decorator', () => {
  it('should mark a class as deprecated', () => {
    @Version('v1')
    @Deprecated()
    class TestRouter {}

    expect(isDeprecated(TestRouter)).toBe(true);
    const meta = getVersionMetadata(TestRouter);
    expect(meta?.deprecated).toBe(true);
  });

  it('should store sunset date', () => {
    const sunset = new Date('2026-12-31');

    @Version('v1')
    @Deprecated(sunset)
    class TestRouter {}

    expect(getDeprecatedSunsetDate(TestRouter)).toEqual(sunset);
    const meta = getVersionMetadata(TestRouter);
    expect(meta?.sunsetDate).toEqual(sunset);
  });

  it('should mark a method as deprecated with sunset date', () => {
    const sunset = new Date('2026-06-01');

    class TestRouter {
      @Version('v1')
      @Deprecated(sunset)
      legacyList() {}
    }

    const instance = new TestRouter();
    expect(isDeprecated(instance, 'legacyList')).toBe(true);
    expect(getDeprecatedSunsetDate(instance, 'legacyList')).toEqual(sunset);
  });

  it('should return false for non-deprecated', () => {
    class TestRouter {
      list() {}
    }

    expect(isDeprecated(TestRouter)).toBe(false);
    expect(getDeprecatedSunsetDate(TestRouter)).toBeUndefined();
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

describe('versionMiddleware', () => {
  it('should add apiVersion to context', async () => {
    const middleware = versionMiddleware({
      supported: ['v1', 'v2'],
      current: 'v2',
      defaultVersion: 'v1',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {
      request: new Request('https://example.com', {
        headers: { 'Accept-Version': 'v2' },
      }),
    };

    await middleware({ ctx, next });

    expect(next).toHaveBeenCalledTimes(1);
    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.apiVersion).toBe('v2');
    expect(passedCtx.apiVersionHeaders).toBeDefined();
    expect(passedCtx.apiVersionHeaders['API-Version']).toBe('v2');
  });

  it('should fall back to default version when no header present', async () => {
    const middleware = versionMiddleware({
      supported: ['v1', 'v2'],
      current: 'v2',
      defaultVersion: 'v1',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { request: new Request('https://example.com') };

    await middleware({ ctx, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.apiVersion).toBe('v1');
  });

  it('should throw BAD_REQUEST for unsupported version', async () => {
    const middleware = versionMiddleware({
      supported: ['v1'],
      current: 'v1',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn();
    const ctx = {
      request: new Request('https://example.com', {
        headers: { 'Accept-Version': 'v99' },
      }),
    };

    await expect(middleware({ ctx, next })).rejects.toThrow(TRPCError);
    try {
      await middleware({ ctx, next });
    } catch (err) {
      expect((err as TRPCError).code).toBe('BAD_REQUEST');
    }
  });

  it('should set deprecated flag for deprecated versions', async () => {
    const middleware = versionMiddleware({
      supported: ['v1', 'v2'],
      deprecated: ['v1'],
      current: 'v2',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {
      request: new Request('https://example.com', {
        headers: { 'Accept-Version': 'v1' },
      }),
    };

    await middleware({ ctx, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.apiVersion).toBe('v1');
    expect(passedCtx.apiVersionDeprecated).toBe(true);
    expect(passedCtx.apiVersionHeaders['Deprecation']).toBe('true');
  });

  it('should handle missing request gracefully', async () => {
    const middleware = versionMiddleware({
      supported: ['v1'],
      current: 'v1',
      defaultVersion: 'v1',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {};

    await middleware({ ctx, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.apiVersion).toBe('v1');
  });
});

describe('versionedProcedure', () => {
  it('should pass when version matches', async () => {
    const middleware = versionedProcedure('v2', {
      supported: ['v1', 'v2'],
      current: 'v2',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {
      request: new Request('https://example.com', {
        headers: { 'Accept-Version': 'v2' },
      }),
    };

    await middleware({ ctx, next });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should reject when version does not match', async () => {
    const middleware = versionedProcedure('v2', {
      supported: ['v1', 'v2'],
      current: 'v2',
      defaultVersion: 'v1',
      strategy: VersionStrategy.HEADER,
    });

    const next = vi.fn();
    const ctx = {
      request: new Request('https://example.com', {
        headers: { 'Accept-Version': 'v1' },
      }),
    };

    await expect(middleware({ ctx, next })).rejects.toThrow(TRPCError);
    try {
      await middleware({ ctx, next });
    } catch (err) {
      expect((err as TRPCError).code).toBe('BAD_REQUEST');
      expect((err as TRPCError).message).toContain('requires API version "v2"');
    }
  });
});

// ─── Header Helpers ──────────────────────────────────────────────────────────

describe('versionHeaders', () => {
  it('should return version headers from context', () => {
    const headers = versionHeaders({
      apiVersionHeaders: {
        'API-Version': 'v2',
        'Deprecation': 'true',
        'Sunset': 'Sat, 01 Jun 2026 00:00:00 GMT',
      },
    });

    expect(headers['API-Version']).toBe('v2');
    expect(headers['Deprecation']).toBe('true');
    expect(headers['Sunset']).toBeDefined();
  });

  it('should return empty object when no headers in context', () => {
    const headers = versionHeaders({});
    expect(headers).toEqual({});
  });
});

// ─── DEFAULT_VERSION_CONFIG ──────────────────────────────────────────────────

describe('DEFAULT_VERSION_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_VERSION_CONFIG.current).toBe('v1');
    expect(DEFAULT_VERSION_CONFIG.supported).toEqual(['v1']);
    expect(DEFAULT_VERSION_CONFIG.strategy).toBe(VersionStrategy.HEADER);
    expect(DEFAULT_VERSION_CONFIG.headerName).toBe('Accept-Version');
    expect(DEFAULT_VERSION_CONFIG.queryParam).toBe('version');
    expect(DEFAULT_VERSION_CONFIG.defaultVersion).toBe('v1');
  });
});
