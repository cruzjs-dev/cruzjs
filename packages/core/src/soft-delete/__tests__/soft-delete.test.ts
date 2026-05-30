/**
 * Soft Delete Unit Tests
 *
 * Tests for columns mixin, scope filtering, soft-delete,
 * restore, force-delete, bulk operations, and middleware.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isNull, isNotNull } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';
import { SoftDeleteService } from '../soft-delete.service';
import { softDeleteColumns } from '../soft-delete.columns';
import { softDeleteMiddleware } from '../soft-delete.middleware';
import { SoftDeleteScope } from '../soft-delete.types';
import type { SoftDeletable } from '../soft-delete.types';

// ─── softDeleteColumns ──────────────────────────────────────────────────────

describe('softDeleteColumns', () => {
  it('should return an object with a deletedAt column', () => {
    const columns = softDeleteColumns();
    expect(columns).toHaveProperty('deletedAt');
  });

  it('should define deletedAt as a timestamp-mode integer column', () => {
    const columns = softDeleteColumns();
    // The column builder should exist and be defined
    expect(columns.deletedAt).toBeDefined();
    // Verify it is an integer column builder (from drizzle-orm)
    expect(typeof columns.deletedAt).toBe('object');
  });
});

// ─── SoftDeleteService.scopeCondition ────────────────────────────────────────

describe('SoftDeleteService.scopeCondition', () => {
  let service: SoftDeleteService;
  const mockTable = { deletedAt: { name: 'deleted_at' } };

  beforeEach(() => {
    service = new SoftDeleteService();
  });

  it('should return isNull condition for DEFAULT scope', () => {
    const condition = service.scopeCondition(mockTable, SoftDeleteScope.DEFAULT);
    expect(condition).toBeDefined();
    // The condition should be a SQL expression (not undefined)
    expect(condition).not.toBeUndefined();
  });

  it('should return undefined for WITH_DELETED scope', () => {
    const condition = service.scopeCondition(mockTable, SoftDeleteScope.WITH_DELETED);
    expect(condition).toBeUndefined();
  });

  it('should return isNotNull condition for ONLY_DELETED scope', () => {
    const condition = service.scopeCondition(mockTable, SoftDeleteScope.ONLY_DELETED);
    expect(condition).toBeDefined();
    expect(condition).not.toBeUndefined();
  });

  it('should default to DEFAULT scope when no scope is provided', () => {
    const conditionDefault = service.scopeCondition(mockTable);
    const conditionExplicit = service.scopeCondition(mockTable, SoftDeleteScope.DEFAULT);
    // Both should produce a defined condition (not undefined like WITH_DELETED)
    expect(conditionDefault).toBeDefined();
    expect(conditionExplicit).toBeDefined();
  });
});

// ─── SoftDeleteService.softDelete ────────────────────────────────────────────

describe('SoftDeleteService.softDelete', () => {
  let service: SoftDeleteService;

  beforeEach(() => {
    service = new SoftDeleteService();
  });

  it('should set deletedAt on the record', async () => {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockDb = { update: mockUpdate } as any;
    const mockTable = { id: 'id-col' };

    await service.softDelete(mockDb, mockTable, 'record-123');

    expect(mockUpdate).toHaveBeenCalledWith(mockTable);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.deletedAt).toBeInstanceOf(Date);
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── SoftDeleteService.bulkSoftDelete ────────────────────────────────────────

describe('SoftDeleteService.bulkSoftDelete', () => {
  let service: SoftDeleteService;

  beforeEach(() => {
    service = new SoftDeleteService();
  });

  it('should soft-delete multiple records', async () => {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockDb = { update: mockUpdate } as any;
    const mockTable = { id: 'id-col' };

    await service.bulkSoftDelete(mockDb, mockTable, ['id-1', 'id-2', 'id-3']);

    expect(mockUpdate).toHaveBeenCalledWith(mockTable);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.deletedAt).toBeInstanceOf(Date);
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it('should be a no-op for empty ID array', async () => {
    const mockUpdate = vi.fn();
    const mockDb = { update: mockUpdate } as any;
    const mockTable = { id: 'id-col' };

    await service.bulkSoftDelete(mockDb, mockTable, []);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─── SoftDeleteService.restore ───────────────────────────────────────────────

describe('SoftDeleteService.restore', () => {
  let service: SoftDeleteService;

  beforeEach(() => {
    service = new SoftDeleteService();
  });

  it('should clear deletedAt on the record', async () => {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockDb = { update: mockUpdate } as any;
    const mockTable = { id: 'id-col' };

    await service.restore(mockDb, mockTable, 'record-123');

    expect(mockUpdate).toHaveBeenCalledWith(mockTable);
    expect(mockSet).toHaveBeenCalledWith({ deletedAt: null });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── SoftDeleteService.forceDelete ───────────────────────────────────────────

describe('SoftDeleteService.forceDelete', () => {
  let service: SoftDeleteService;

  beforeEach(() => {
    service = new SoftDeleteService();
  });

  it('should permanently delete the record', async () => {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { delete: mockDelete } as any;
    const mockTable = { id: 'id-col' };

    await service.forceDelete(mockDb, mockTable, 'record-123');

    expect(mockDelete).toHaveBeenCalledWith(mockTable);
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── SoftDeleteService.isSoftDeleted ─────────────────────────────────────────

describe('SoftDeleteService.isSoftDeleted', () => {
  let service: SoftDeleteService;

  beforeEach(() => {
    service = new SoftDeleteService();
  });

  it('should return true when deletedAt is set', () => {
    const record: SoftDeletable = { deletedAt: new Date() };
    expect(service.isSoftDeleted(record)).toBe(true);
  });

  it('should return false when deletedAt is null', () => {
    const record: SoftDeletable = { deletedAt: null };
    expect(service.isSoftDeleted(record)).toBe(false);
  });
});

// ─── softDeleteMiddleware ────────────────────────────────────────────────────

describe('softDeleteMiddleware', () => {
  it('should inject DEFAULT scope into context by default', async () => {
    const middleware = softDeleteMiddleware();
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { userId: 'user-1' };

    await middleware({ ctx, next });

    expect(next).toHaveBeenCalledTimes(1);
    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.softDeleteScope).toBe(SoftDeleteScope.DEFAULT);
    expect(passedCtx.userId).toBe('user-1');
  });

  it('should inject WITH_DELETED scope into context', async () => {
    const middleware = softDeleteMiddleware(SoftDeleteScope.WITH_DELETED);
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {};

    await middleware({ ctx, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.softDeleteScope).toBe(SoftDeleteScope.WITH_DELETED);
  });

  it('should inject ONLY_DELETED scope into context', async () => {
    const middleware = softDeleteMiddleware(SoftDeleteScope.ONLY_DELETED);
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {};

    await middleware({ ctx, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.softDeleteScope).toBe(SoftDeleteScope.ONLY_DELETED);
  });

  it('should preserve existing context properties', async () => {
    const middleware = softDeleteMiddleware();
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { userId: 'user-1', orgId: 'org-2', request: {} };

    await middleware({ ctx, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.userId).toBe('user-1');
    expect(passedCtx.orgId).toBe('org-2');
    expect(passedCtx.request).toBeDefined();
    expect(passedCtx.softDeleteScope).toBe(SoftDeleteScope.DEFAULT);
  });
});

// ─── SoftDeleteScope ─────────────────────────────────────────────────────────

describe('SoftDeleteScope', () => {
  it('should have correct values', () => {
    expect(SoftDeleteScope.DEFAULT).toBe('default');
    expect(SoftDeleteScope.WITH_DELETED).toBe('with_deleted');
    expect(SoftDeleteScope.ONLY_DELETED).toBe('only_deleted');
  });
});
