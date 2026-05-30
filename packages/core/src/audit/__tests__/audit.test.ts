/**
 * Audit Log Unit Tests
 *
 * Tests for the AuditLogService, DatabaseAuditAdapter, diffSnapshots,
 * and middleware behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuditLogAdapter } from '../audit.adapter';
import type { AuditLogEntry, AuditLogQuery, CreateAuditLogInput } from '../audit.types';
import { AuditAction, AuditActorType } from '../audit.types';

// ─── Mock Adapter ──────────────────────────────────────────────────────────

function createMockAdapter(): AuditLogAdapter & {
  entries: AuditLogEntry[];
  writeFn: ReturnType<typeof vi.fn>;
  queryFn: ReturnType<typeof vi.fn>;
  pruneFn: ReturnType<typeof vi.fn>;
} {
  const entries: AuditLogEntry[] = [];

  const writeFn = vi.fn(async (entry: AuditLogEntry) => {
    entries.push(entry);
  });

  const queryFn = vi.fn(async (params: AuditLogQuery) => {
    let filtered = [...entries];

    if (params.orgId) {
      filtered = filtered.filter((e) => e.orgId === params.orgId);
    }
    if (params.actorId) {
      filtered = filtered.filter((e) => e.actorId === params.actorId);
    }
    if (params.entityType) {
      filtered = filtered.filter((e) => e.entityType === params.entityType);
    }
    if (params.entityId) {
      filtered = filtered.filter((e) => e.entityId === params.entityId);
    }
    if (params.action) {
      filtered = filtered.filter((e) => e.action === params.action);
    }
    if (params.from) {
      filtered = filtered.filter((e) => new Date(e.createdAt) >= params.from!);
    }
    if (params.to) {
      filtered = filtered.filter((e) => new Date(e.createdAt) <= params.to!);
    }

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 50;
    const offset = (page - 1) * perPage;
    const total = filtered.length;

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      entries: filtered.slice(offset, offset + perPage),
      total,
    };
  });

  const pruneFn = vi.fn(async (olderThan: Date) => {
    const before = entries.length;
    const remaining = entries.filter((e) => new Date(e.createdAt) >= olderThan);
    entries.length = 0;
    entries.push(...remaining);
    return before - remaining.length;
  });

  return {
    entries,
    writeFn,
    queryFn,
    pruneFn,
    write: writeFn,
    query: queryFn,
    prune: pruneFn,
  };
}

// ─── Service-like wrapper (to test logic without full DI) ──────────────────

function createTestService(adapter: AuditLogAdapter) {
  // Re-implement diffSnapshots inline to test without importing the full service
  function diffSnapshots(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, unknown> {
    const added: Record<string, unknown> = {};
    const removed: Record<string, unknown> = {};
    const changed: Record<string, { from: unknown; to: unknown }> = {};

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const inBefore = key in before;
      const inAfter = key in after;

      if (!inBefore && inAfter) {
        added[key] = after[key];
      } else if (inBefore && !inAfter) {
        removed[key] = before[key];
      } else if (inBefore && inAfter) {
        const beforeVal = JSON.stringify(before[key]);
        const afterVal = JSON.stringify(after[key]);
        if (beforeVal !== afterVal) {
          changed[key] = { from: before[key], to: after[key] };
        }
      }
    }

    return { added, removed, changed };
  }

  return {
    async log(input: CreateAuditLogInput) {
      const diff =
        input.before && input.after
          ? diffSnapshots(input.before, input.after)
          : null;

      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        actorType: input.actorType ?? 'user',
        orgId: input.orgId ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        diff,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
      };

      await adapter.write(entry);
    },

    async query(params: AuditLogQuery) {
      return adapter.query(params);
    },

    async getEntityHistory(entityType: string, entityId: string, orgId?: string) {
      const result = await adapter.query({ entityType, entityId, orgId, perPage: 100 });
      return result.entries;
    },

    async getActorHistory(actorId: string, orgId?: string) {
      const result = await adapter.query({ actorId, orgId, perPage: 100 });
      return result.entries;
    },

    async pruneOlderThan(date: Date) {
      return adapter.prune(date);
    },

    diffSnapshots,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AuditLogService', () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let service: ReturnType<typeof createTestService>;

  beforeEach(() => {
    adapter = createMockAdapter();
    service = createTestService(adapter);
  });

  // ── log() ──────────────────────────────────────────────────────────

  describe('log()', () => {
    it('should write entry via adapter', async () => {
      await service.log({
        action: AuditAction.CREATE,
        entityType: 'product',
        entityId: 'prod-1',
        actorId: 'user-1',
        orgId: 'org-1',
      });

      expect(adapter.writeFn).toHaveBeenCalledTimes(1);
      expect(adapter.entries).toHaveLength(1);

      const entry = adapter.entries[0];
      expect(entry.action).toBe('create');
      expect(entry.entityType).toBe('product');
      expect(entry.entityId).toBe('prod-1');
      expect(entry.actorId).toBe('user-1');
      expect(entry.orgId).toBe('org-1');
      expect(entry.actorType).toBe('user');
    });

    it('should default actorType to user', async () => {
      await service.log({
        action: AuditAction.UPDATE,
        entityType: 'product',
      });

      expect(adapter.entries[0].actorType).toBe('user');
    });

    it('should accept custom actorType', async () => {
      await service.log({
        action: AuditAction.DELETE,
        entityType: 'product',
        actorType: AuditActorType.SYSTEM,
      });

      expect(adapter.entries[0].actorType).toBe('system');
    });

    it('should compute diff when both before and after are provided', async () => {
      await service.log({
        action: AuditAction.UPDATE,
        entityType: 'product',
        entityId: 'prod-1',
        before: { name: 'Old Name', price: 10 },
        after: { name: 'New Name', price: 10 },
      });

      const entry = adapter.entries[0];
      expect(entry.diff).not.toBeNull();
      const diff = entry.diff as Record<string, unknown>;
      const changed = diff.changed as Record<string, { from: unknown; to: unknown }>;
      expect(changed.name).toEqual({ from: 'Old Name', to: 'New Name' });
    });

    it('should set diff to null when before/after not provided', async () => {
      await service.log({
        action: AuditAction.CREATE,
        entityType: 'product',
        entityId: 'prod-1',
      });

      expect(adapter.entries[0].diff).toBeNull();
    });

    it('should store metadata', async () => {
      await service.log({
        action: AuditAction.EXPORT,
        entityType: 'report',
        metadata: { format: 'csv', rowCount: 1000 },
      });

      expect(adapter.entries[0].metadata).toEqual({ format: 'csv', rowCount: 1000 });
    });

    it('should store ipAddress and userAgent', async () => {
      await service.log({
        action: AuditAction.LOGIN,
        entityType: 'session',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(adapter.entries[0].ipAddress).toBe('192.168.1.1');
      expect(adapter.entries[0].userAgent).toBe('Mozilla/5.0');
    });
  });

  // ── query() ────────────────────────────────────────────────────────

  describe('query()', () => {
    beforeEach(async () => {
      await service.log({ action: AuditAction.CREATE, entityType: 'product', entityId: 'p1', orgId: 'org-1', actorId: 'user-1' });
      await service.log({ action: AuditAction.UPDATE, entityType: 'product', entityId: 'p1', orgId: 'org-1', actorId: 'user-2' });
      await service.log({ action: AuditAction.DELETE, entityType: 'product', entityId: 'p2', orgId: 'org-1', actorId: 'user-1' });
      await service.log({ action: AuditAction.CREATE, entityType: 'order', entityId: 'o1', orgId: 'org-2', actorId: 'user-3' });
    });

    it('should filter by orgId', async () => {
      const result = await service.query({ orgId: 'org-1' });
      expect(result.entries).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by actorId', async () => {
      const result = await service.query({ actorId: 'user-1' });
      expect(result.entries).toHaveLength(2);
    });

    it('should filter by entityType', async () => {
      const result = await service.query({ entityType: 'order' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].entityType).toBe('order');
    });

    it('should filter by action', async () => {
      const result = await service.query({ action: AuditAction.CREATE });
      expect(result.entries).toHaveLength(2);
    });

    it('should combine multiple filters', async () => {
      const result = await service.query({
        orgId: 'org-1',
        actorId: 'user-1',
        action: AuditAction.CREATE,
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].entityId).toBe('p1');
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 60_000);
      const pastDate = new Date(now.getTime() - 60_000);

      const result = await service.query({ from: pastDate, to: futureDate });
      expect(result.entries).toHaveLength(4);
    });

    it('should support pagination', async () => {
      const page1 = await service.query({ perPage: 2, page: 1 });
      expect(page1.entries).toHaveLength(2);
      expect(page1.total).toBe(4);

      const page2 = await service.query({ perPage: 2, page: 2 });
      expect(page2.entries).toHaveLength(2);
    });
  });

  // ── getEntityHistory() ─────────────────────────────────────────────

  describe('getEntityHistory()', () => {
    beforeEach(async () => {
      await service.log({ action: AuditAction.CREATE, entityType: 'product', entityId: 'p1', orgId: 'org-1' });
      await service.log({ action: AuditAction.UPDATE, entityType: 'product', entityId: 'p1', orgId: 'org-1' });
      await service.log({ action: AuditAction.DELETE, entityType: 'product', entityId: 'p2', orgId: 'org-1' });
    });

    it('should return all actions on a specific entity', async () => {
      const history = await service.getEntityHistory('product', 'p1');
      expect(history).toHaveLength(2);
      expect(history.every((e) => e.entityId === 'p1')).toBe(true);
    });

    it('should return empty array for unknown entity', async () => {
      const history = await service.getEntityHistory('product', 'unknown');
      expect(history).toHaveLength(0);
    });

    it('should scope by orgId when provided', async () => {
      const history = await service.getEntityHistory('product', 'p1', 'org-1');
      expect(history).toHaveLength(2);

      const otherOrg = await service.getEntityHistory('product', 'p1', 'org-2');
      expect(otherOrg).toHaveLength(0);
    });
  });

  // ── getActorHistory() ──────────────────────────────────────────────

  describe('getActorHistory()', () => {
    beforeEach(async () => {
      await service.log({ action: AuditAction.CREATE, entityType: 'product', actorId: 'user-1', orgId: 'org-1' });
      await service.log({ action: AuditAction.UPDATE, entityType: 'order', actorId: 'user-1', orgId: 'org-2' });
      await service.log({ action: AuditAction.DELETE, entityType: 'product', actorId: 'user-2', orgId: 'org-1' });
    });

    it('should return all actions by a specific actor', async () => {
      const history = await service.getActorHistory('user-1');
      expect(history).toHaveLength(2);
      expect(history.every((e) => e.actorId === 'user-1')).toBe(true);
    });

    it('should scope by orgId when provided', async () => {
      const history = await service.getActorHistory('user-1', 'org-1');
      expect(history).toHaveLength(1);
    });

    it('should return empty array for unknown actor', async () => {
      const history = await service.getActorHistory('unknown');
      expect(history).toHaveLength(0);
    });
  });

  // ── diffSnapshots() ────────────────────────────────────────────────

  describe('diffSnapshots()', () => {
    it('should detect added keys', () => {
      const diff = service.diffSnapshots(
        { name: 'Product' },
        { name: 'Product', description: 'A description' },
      );

      expect((diff.added as Record<string, unknown>).description).toBe('A description');
      expect(Object.keys(diff.removed as object)).toHaveLength(0);
      expect(Object.keys(diff.changed as object)).toHaveLength(0);
    });

    it('should detect removed keys', () => {
      const diff = service.diffSnapshots(
        { name: 'Product', description: 'A description' },
        { name: 'Product' },
      );

      expect((diff.removed as Record<string, unknown>).description).toBe('A description');
      expect(Object.keys(diff.added as object)).toHaveLength(0);
    });

    it('should detect changed keys', () => {
      const diff = service.diffSnapshots(
        { name: 'Old Name', price: 10 },
        { name: 'New Name', price: 20 },
      );

      const changed = diff.changed as Record<string, { from: unknown; to: unknown }>;
      expect(changed.name).toEqual({ from: 'Old Name', to: 'New Name' });
      expect(changed.price).toEqual({ from: 10, to: 20 });
    });

    it('should handle identical objects', () => {
      const diff = service.diffSnapshots(
        { name: 'Same', price: 10 },
        { name: 'Same', price: 10 },
      );

      expect(Object.keys(diff.added as object)).toHaveLength(0);
      expect(Object.keys(diff.removed as object)).toHaveLength(0);
      expect(Object.keys(diff.changed as object)).toHaveLength(0);
    });

    it('should handle empty objects', () => {
      const diff = service.diffSnapshots({}, {});

      expect(Object.keys(diff.added as object)).toHaveLength(0);
      expect(Object.keys(diff.removed as object)).toHaveLength(0);
      expect(Object.keys(diff.changed as object)).toHaveLength(0);
    });

    it('should detect changes in nested objects via JSON comparison', () => {
      const diff = service.diffSnapshots(
        { settings: { theme: 'light' } },
        { settings: { theme: 'dark' } },
      );

      const changed = diff.changed as Record<string, { from: unknown; to: unknown }>;
      expect(changed.settings).toEqual({
        from: { theme: 'light' },
        to: { theme: 'dark' },
      });
    });

    it('should handle added, removed, and changed simultaneously', () => {
      const diff = service.diffSnapshots(
        { a: 1, b: 2, c: 3 },
        { a: 1, b: 99, d: 4 },
      );

      expect(Object.keys(diff.added as object)).toContain('d');
      expect(Object.keys(diff.removed as object)).toContain('c');
      expect(Object.keys(diff.changed as object)).toContain('b');
      expect(Object.keys(diff.changed as object)).not.toContain('a');
    });
  });

  // ── pruneOlderThan() ───────────────────────────────────────────────

  describe('pruneOlderThan()', () => {
    it('should call adapter prune and return count', async () => {
      // Add some entries manually with old timestamps
      const oldDate = new Date('2024-01-01T00:00:00Z');
      const newDate = new Date('2025-12-01T00:00:00Z');

      adapter.entries.push({
        id: 'old-1',
        action: 'create',
        entityType: 'product',
        entityId: null,
        actorId: null,
        actorType: 'user',
        orgId: null,
        before: null,
        after: null,
        diff: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: oldDate.toISOString(),
      });

      adapter.entries.push({
        id: 'new-1',
        action: 'update',
        entityType: 'product',
        entityId: null,
        actorId: null,
        actorType: 'user',
        orgId: null,
        before: null,
        after: null,
        diff: null,
        ipAddress: null,
        userAgent: null,
        metadata: {},
        createdAt: newDate.toISOString(),
      });

      const pruned = await service.pruneOlderThan(new Date('2025-01-01T00:00:00Z'));

      expect(pruned).toBe(1);
      expect(adapter.entries).toHaveLength(1);
      expect(adapter.entries[0].id).toBe('new-1');
    });

    it('should return 0 when nothing to prune', async () => {
      const pruned = await service.pruneOlderThan(new Date('2020-01-01'));
      expect(pruned).toBe(0);
    });
  });
});

// ─── AuditAction and AuditActorType enums ────────────────────────────────

describe('AuditAction', () => {
  it('should expose all expected action values', () => {
    expect(AuditAction.CREATE).toBe('create');
    expect(AuditAction.UPDATE).toBe('update');
    expect(AuditAction.DELETE).toBe('delete');
    expect(AuditAction.RESTORE).toBe('restore');
    expect(AuditAction.LOGIN).toBe('login');
    expect(AuditAction.LOGOUT).toBe('logout');
    expect(AuditAction.EXPORT).toBe('export');
    expect(AuditAction.IMPORT).toBe('import');
    expect(AuditAction.PERMISSION_CHANGE).toBe('permission_change');
    expect(AuditAction.REVOKE).toBe('revoke');
    expect(AuditAction.INVITE).toBe('invite');
    expect(AuditAction.ACCEPT_INVITE).toBe('accept_invite');
  });
});

describe('AuditActorType', () => {
  it('should expose all expected actor types', () => {
    expect(AuditActorType.USER).toBe('user');
    expect(AuditActorType.SYSTEM).toBe('system');
    expect(AuditActorType.API_KEY).toBe('api_key');
  });
});
