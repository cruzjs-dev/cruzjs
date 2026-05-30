/**
 * API Key Scope Authorization Tests
 *
 * Verifies scope matching logic, requireApiKeyScope middleware behavior,
 * and getUsageStats service method.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { hasScope, requireApiKeyScope } from '../api-key.middleware';
import type { ValidatedApiKey } from '../api-key.types';
import type { ApiKeyService } from '../api-key.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createValidatedKey(overrides: Partial<ValidatedApiKey> = {}): ValidatedApiKey {
  return {
    id: 'key-1',
    orgId: 'org-123',
    scopes: ['api-keys:read'],
    projectScope: null,
    ...overrides,
  };
}

function createMockApiKeyService(
  validateResult: ValidatedApiKey | null = null,
): ApiKeyService {
  return {
    hashApiKey: vi.fn().mockResolvedValue('hashed-key'),
    validateKey: vi.fn().mockResolvedValue(validateResult),
    generateApiKey: vi.fn(),
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    getApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    getUsageStats: vi.fn(),
    getDefaultScmProvider: vi.fn(),
    setDefaultScmProvider: vi.fn(),
  } as unknown as ApiKeyService;
}

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/test', { headers });
}

// ---------------------------------------------------------------------------
// hasScope
// ---------------------------------------------------------------------------

describe('hasScope', () => {
  it('should return true for exact scope match', () => {
    const key = createValidatedKey({ scopes: ['api-keys:read'] });
    expect(hasScope(key, 'api-keys:read')).toBe(true);
  });

  it('should return true when scopes include wildcard *', () => {
    const key = createValidatedKey({ scopes: ['*'] });
    expect(hasScope(key, 'api-keys:read')).toBe(true);
    expect(hasScope(key, 'webhooks:write')).toBe(true);
    expect(hasScope(key, 'anything:here')).toBe(true);
  });

  it('should return true when resource wildcard matches', () => {
    const key = createValidatedKey({ scopes: ['api-keys:*'] });
    expect(hasScope(key, 'api-keys:read')).toBe(true);
  });

  it('should return true when resource wildcard satisfies write scope', () => {
    const key = createValidatedKey({ scopes: ['api-keys:*'] });
    expect(hasScope(key, 'api-keys:write')).toBe(true);
  });

  it('should return false when scope does not match resource', () => {
    const key = createValidatedKey({ scopes: ['api-keys:read'] });
    expect(hasScope(key, 'webhooks:read')).toBe(false);
  });

  it('should return false for wrong scope', () => {
    const key = createValidatedKey({ scopes: ['api-keys:read'] });
    expect(hasScope(key, 'api-keys:write')).toBe(false);
  });

  it('should return false for empty scopes', () => {
    const key = createValidatedKey({ scopes: [] });
    expect(hasScope(key, 'api-keys:read')).toBe(false);
  });

  it('should handle legacy scopes (READ, WRITE, ADMIN)', () => {
    const key = createValidatedKey({ scopes: ['READ', 'WRITE'] });
    expect(hasScope(key, 'READ')).toBe(true);
    expect(hasScope(key, 'ADMIN')).toBe(false);
  });

  it('should not match partial resource names', () => {
    const key = createValidatedKey({ scopes: ['api:*'] });
    expect(hasScope(key, 'api-keys:read')).toBe(false);
  });

  it('should handle scopes without colon separator', () => {
    const key = createValidatedKey({ scopes: ['admin'] });
    expect(hasScope(key, 'admin')).toBe(true);
    expect(hasScope(key, 'admin:read')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireApiKeyScope
// ---------------------------------------------------------------------------

describe('requireApiKeyScope', () => {
  it('should throw UNAUTHORIZED when no key header is present', async () => {
    const request = createRequest();
    const service = createMockApiKeyService();

    await expect(
      requireApiKeyScope(request, service, 'api-keys:read'),
    ).rejects.toThrow(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
      }),
    );
  });

  it('should throw UNAUTHORIZED for invalid key', async () => {
    const request = createRequest({
      authorization: 'Bearer ax_k_invalidkey1234567890abcdef',
    });
    const service = createMockApiKeyService(null);

    await expect(
      requireApiKeyScope(request, service, 'api-keys:read'),
    ).rejects.toThrow(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
      }),
    );
  });

  it('should throw FORBIDDEN when key lacks required scope', async () => {
    const validatedKey = createValidatedKey({ scopes: ['webhooks:read'] });
    const request = createRequest({
      authorization: 'Bearer ax_k_validkey1234567890abcdef00',
    });
    const service = createMockApiKeyService(validatedKey);

    await expect(
      requireApiKeyScope(request, service, 'api-keys:read'),
    ).rejects.toThrow(
      expect.objectContaining({
        code: 'FORBIDDEN',
      }),
    );
  });

  it('should return validated key on success with Authorization header', async () => {
    const validatedKey = createValidatedKey({ scopes: ['api-keys:read'] });
    const request = createRequest({
      authorization: 'Bearer ax_k_validkey1234567890abcdef00',
    });
    const service = createMockApiKeyService(validatedKey);

    const result = await requireApiKeyScope(request, service, 'api-keys:read');
    expect(result).toEqual(validatedKey);
    expect(service.hashApiKey).toHaveBeenCalledWith('ax_k_validkey1234567890abcdef00');
  });

  it('should return validated key on success with x-api-key header', async () => {
    const validatedKey = createValidatedKey({ scopes: ['api-keys:read'] });
    const request = createRequest({
      'x-api-key': 'ax_k_validkey1234567890abcdef00',
    });
    const service = createMockApiKeyService(validatedKey);

    const result = await requireApiKeyScope(request, service, 'api-keys:read');
    expect(result).toEqual(validatedKey);
  });

  it('should prefer Authorization header over x-api-key header', async () => {
    const validatedKey = createValidatedKey({ scopes: ['*'] });
    const request = createRequest({
      authorization: 'Bearer ax_k_authheaderkey12345678900',
      'x-api-key': 'ax_k_xapikeyheader123456789000',
    });
    const service = createMockApiKeyService(validatedKey);

    await requireApiKeyScope(request, service, 'api-keys:read');
    expect(service.hashApiKey).toHaveBeenCalledWith('ax_k_authheaderkey12345678900');
  });

  it('should accept wildcard scope for any required scope', async () => {
    const validatedKey = createValidatedKey({ scopes: ['*'] });
    const request = createRequest({
      authorization: 'Bearer ax_k_validkey1234567890abcdef00',
    });
    const service = createMockApiKeyService(validatedKey);

    const result = await requireApiKeyScope(request, service, 'anything:here');
    expect(result).toEqual(validatedKey);
  });

  it('should ignore non-ax_k_ Bearer tokens and fall back to x-api-key', async () => {
    const validatedKey = createValidatedKey({ scopes: ['api-keys:read'] });
    const request = createRequest({
      authorization: 'Bearer some-jwt-token',
      'x-api-key': 'ax_k_validkey1234567890abcdef00',
    });
    const service = createMockApiKeyService(validatedKey);

    const result = await requireApiKeyScope(request, service, 'api-keys:read');
    expect(result).toEqual(validatedKey);
    expect(service.hashApiKey).toHaveBeenCalledWith('ax_k_validkey1234567890abcdef00');
  });
});

// ---------------------------------------------------------------------------
// getUsageStats (service method)
// ---------------------------------------------------------------------------

describe('ApiKeyService.getUsageStats', () => {
  it('should return all org keys with usage stats', async () => {
    const mockKeys = [
      { id: 'key-1', name: 'Dev Key', lastUsedAt: '2026-03-15T10:00:00Z', keyPrefix: 'ax_k_abc1' },
      { id: 'key-2', name: 'CI Key', lastUsedAt: null, keyPrefix: 'ax_k_def2' },
      { id: 'key-3', name: 'Prod Key', lastUsedAt: '2026-03-14T08:00:00Z', keyPrefix: 'ax_k_ghi3' },
    ];

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockKeys),
    };

    // Import the service class and instantiate with mock db
    const { ApiKeyService } = await import('../api-key.service');
    const service = new (ApiKeyService as any)(mockDb) as InstanceType<typeof ApiKeyService>;

    const result = await service.getUsageStats('org-123');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: 'key-1',
      name: 'Dev Key',
      lastUsedAt: '2026-03-15T10:00:00Z',
      keyPrefix: 'ax_k_abc1',
    });
    expect(result[1]).toEqual({
      id: 'key-2',
      name: 'CI Key',
      lastUsedAt: null,
      keyPrefix: 'ax_k_def2',
    });
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('should return empty array when org has no keys', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };

    const { ApiKeyService } = await import('../api-key.service');
    const service = new (ApiKeyService as any)(mockDb) as InstanceType<typeof ApiKeyService>;

    const result = await service.getUsageStats('org-empty');
    expect(result).toEqual([]);
  });
});
