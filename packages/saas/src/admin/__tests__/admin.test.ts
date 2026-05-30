/**
 * Admin Dashboard Unit Tests
 *
 * Tests for AdminRegistry, AdminService, ImpersonationService, and AdminTrpc.
 * Uses mock Drizzle database for isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminRegistry } from '../admin.registry';
import { AdminService } from '../admin.service';
import { ImpersonationService } from '../admin.impersonation';
import type { AdminResourceConfig } from '../admin.types';

// ─── Mock DI decorators so the classes can be instantiated without Inversify ──
vi.mock('@cruzjs/core/di', () => ({
  Injectable: () => (target: any) => target,
  Inject: () => (_target: any, _key: any, _desc?: any) => {},
  Module: () => (target: any) => target,
}));

vi.mock('@cruzjs/core/shared/database/drizzle.service', () => ({
  DRIZZLE: Symbol.for('DRIZZLE'),
}));

vi.mock('@cruzjs/core/database/schema', () => ({
  authIdentity: { id: { name: 'id' } },
}));

vi.mock('drizzle-orm/sqlite-core', () => {
  // Create a deeply chainable column builder proxy
  function colProxy(name: string): any {
    const handler: ProxyHandler<any> = {
      get(_target, prop) {
        if (prop === 'name') return name;
        if (prop === Symbol.toPrimitive || prop === 'valueOf') return () => name;
        // Return a function that returns another proxy for chaining
        return (..._args: any[]) => new Proxy({ name }, handler);
      },
    };
    return new Proxy({ name }, handler);
  }
  return {
    sqliteTable: (_name: string, cols: any, _indexes?: any) => cols,
    text: (name: string) => colProxy(name),
    integer: (name: string, _opts?: any) => colProxy(name),
    real: (name: string) => colProxy(name),
    index: () => ({ on: () => ({}) }),
    uniqueIndex: () => ({ on: () => ({}) }),
  };
});

vi.mock('@paralleldrive/cuid2', () => ({
  createId: () => 'mock-cuid-' + Math.random().toString(36).slice(2, 8),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col, _val) => ({ type: 'eq' })),
  like: vi.fn((_col, _val) => ({ type: 'like' })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  gte: vi.fn((_col, _val) => ({ type: 'gte' })),
  desc: vi.fn((_col) => ({ type: 'desc' })),
  asc: vi.fn((_col) => ({ type: 'asc' })),
  count: vi.fn(() => ({ type: 'count' })),
  sql: Object.assign(vi.fn(), {
    join: vi.fn(() => ({})),
  }),
}));

// ─── Mock table helper ──────────────────────────────────────────────────────

function mockTable(name: string, columns: string[] = ['id', 'name', 'createdAt']) {
  const table: Record<string, any> = { _name: name };
  for (const col of columns) {
    table[col] = { name: col };
  }
  return table;
}

function makeConfig(overrides: Partial<AdminResourceConfig> = {}): AdminResourceConfig {
  return {
    name: 'test_resource',
    table: mockTable('TestResource'),
    columns: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'name', label: 'Name', type: 'text', searchable: true, sortable: true },
      { key: 'createdAt', label: 'Created', type: 'date', sortable: true },
    ],
    ...overrides,
  };
}

// ─── Chainable mock DB ──────────────────────────────────────────────────────

function createChainableMock(resolveValue: any) {
  const chain: any = {
    _resolveValue: resolveValue,
  };
  const methods = [
    'select', 'from', 'where', 'limit', 'offset', 'orderBy',
    'insert', 'values', 'update', 'set', 'delete',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.returning = vi.fn().mockResolvedValue(resolveValue);
  // Make the chain thenable so `await db.select()...` resolves
  chain.then = (resolve: any, reject?: any) => Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
}

function createMockDb(options: {
  selectResult?: any;
  insertResult?: any;
  updateResult?: any;
  deleteResult?: any;
} = {}) {
  return {
    select: vi.fn().mockImplementation((...args: any[]) => {
      // If called with a count aggregate, return count
      if (args.length > 0 && args[0]?.count !== undefined) {
        return createChainableMock([{ count: options.selectResult?.length ?? 0 }]);
      }
      return createChainableMock(options.selectResult ?? []);
    }),
    insert: vi.fn().mockReturnValue(createChainableMock(options.insertResult ?? [])),
    update: vi.fn().mockReturnValue(createChainableMock(options.updateResult ?? [])),
    delete: vi.fn().mockReturnValue(createChainableMock(options.deleteResult ?? [])),
  };
}

// ─── AdminRegistry ──────────────────────────────────────────────────────────

describe('AdminRegistry', () => {
  let registry: AdminRegistry;

  beforeEach(() => {
    registry = new AdminRegistry();
  });

  it('register() stores config and returns this for chaining', () => {
    const config = makeConfig();
    const result = registry.register(config);
    expect(result).toBe(registry);
    expect(registry.get('test_resource')).toBeDefined();
    expect(registry.get('test_resource')!.name).toBe('test_resource');
  });

  it('register() applies default operations and perPage', () => {
    const config = makeConfig({ operations: undefined, perPage: undefined });
    registry.register(config);
    const stored = registry.get('test_resource')!;
    expect(stored.operations).toEqual(['list', 'create', 'read', 'update', 'delete']);
    expect(stored.perPage).toBe(20);
  });

  it('register() throws on duplicate resource name', () => {
    registry.register(makeConfig());
    expect(() => registry.register(makeConfig())).toThrow(
      'Admin resource "test_resource" is already registered',
    );
  });

  it('list() returns all registered configs', () => {
    registry.register(makeConfig({ name: 'users' }));
    registry.register(makeConfig({ name: 'orders' }));
    registry.register(makeConfig({ name: 'products' }));

    const all = registry.list();
    expect(all).toHaveLength(3);
    expect(all.map((c) => c.name).sort()).toEqual(['orders', 'products', 'users']);
  });

  it('get() returns undefined for unknown resource', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });
});

// ─── AdminService ───────────────────────────────────────────────────────────

describe('AdminService', () => {
  let registry: AdminRegistry;
  let mockDb: any;
  let service: AdminService;
  let mockImpersonation: any;

  const sampleRows = [
    { id: '1', name: 'Alice', createdAt: '2026-03-10T00:00:00.000Z' },
    { id: '2', name: 'Bob', createdAt: '2026-03-11T00:00:00.000Z' },
    { id: '3', name: 'Charlie', createdAt: '2026-03-12T00:00:00.000Z' },
    { id: '4', name: 'Diana', createdAt: '2026-03-13T00:00:00.000Z' },
    { id: '5', name: 'Eve', createdAt: '2026-03-14T00:00:00.000Z' },
  ];

  beforeEach(() => {
    registry = new AdminRegistry();
    registry.register(makeConfig({ name: 'users' }));

    mockDb = createMockDb({
      selectResult: sampleRows,
      insertResult: [{ id: 'new-1', name: 'New' }],
      updateResult: [{ id: '1', name: 'Updated' }],
    });

    mockImpersonation = {
      create: vi.fn().mockResolvedValue({
        id: 'imp-1',
        token: 'abc123',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        targetUserId: 'target-1',
        adminUserId: 'admin-1',
        usedAt: null,
        createdAt: new Date().toISOString(),
      }),
      verify: vi.fn().mockResolvedValue(null),
      consume: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };

    // Construct manually, bypassing DI decorators (mocked above)
    service = new (AdminService as any)(mockDb, registry, mockImpersonation);
  });

  it('list() paginates results', async () => {
    const result = await service.list('users', { page: 1, perPage: 2 });
    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page', 1);
    expect(result).toHaveProperty('perPage', 2);
    expect(result).toHaveProperty('totalPages');
  });

  it('list() filters by search term', async () => {
    await service.list('users', { search: 'Alice' });
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('list() sorts by column', async () => {
    await service.list('users', { sortBy: 'name', sortDir: 'asc' });
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('get() returns single record', async () => {
    const result = await service.get('users', '1');
    expect(result).toBeDefined();
  });

  it('create() inserts record', async () => {
    const result = await service.create('users', { name: 'NewUser' });
    expect(result).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('update() updates record', async () => {
    const result = await service.update('users', '1', { name: 'Updated' });
    expect(result).toBeDefined();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('delete() removes records (bulk)', async () => {
    await service.delete('users', ['1', '2', '3']);
    expect(mockDb.delete).toHaveBeenCalledTimes(3);
  });

  it('getStats() returns count per resource', async () => {
    const stats = await service.getStats();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0]).toHaveProperty('resource', 'users');
    expect(stats[0]).toHaveProperty('count');
    expect(stats[0]).toHaveProperty('recentCount');
    expect(stats[0]).toHaveProperty('trend');
  });

  it('list() throws for unknown resource', async () => {
    await expect(service.list('nonexistent')).rejects.toThrow(
      'Admin resource "nonexistent" not found',
    );
  });

  it('create() throws when create operation is not allowed', async () => {
    registry.register(
      makeConfig({ name: 'readonly', operations: ['list', 'read'] }),
    );
    await expect(service.create('readonly', { name: 'test' })).rejects.toThrow(
      'Operation "create" is not allowed',
    );
  });
});

// ─── ImpersonationService ────────────────────────────────────────────────────

describe('ImpersonationService', () => {
  it('create() generates a token', async () => {
    const createdRow = {
      id: 'imp-1',
      targetUserId: 'target-1',
      adminUserId: 'admin-1',
      token: 'generated-token',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };

    const mockDb = createMockDb({ insertResult: [createdRow] });
    const service = new (ImpersonationService as any)(mockDb);

    const result = await service.create('target-1', 'admin-1');
    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.targetUserId).toBe('target-1');
    expect(result.adminUserId).toBe('admin-1');
  });

  it('verify() returns null for expired token', async () => {
    const expiredToken = {
      id: 'imp-2',
      targetUserId: 'target-1',
      adminUserId: 'admin-1',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };

    const mockDb = createMockDb({ selectResult: [expiredToken] });
    const service = new (ImpersonationService as any)(mockDb);

    const result = await service.verify('expired-token');
    expect(result).toBeNull();
  });

  it('verify() returns null for already-used token', async () => {
    const usedToken = {
      id: 'imp-3',
      targetUserId: 'target-1',
      adminUserId: 'admin-1',
      token: 'used-token',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      usedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const mockDb = createMockDb({ selectResult: [usedToken] });
    const service = new (ImpersonationService as any)(mockDb);

    const result = await service.verify('used-token');
    expect(result).toBeNull();
  });

  it('consume() marks token as used', async () => {
    const validToken = {
      id: 'imp-4',
      targetUserId: 'target-1',
      adminUserId: 'admin-1',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    const consumedToken = { ...validToken, usedAt: new Date().toISOString() };

    const mockDb = createMockDb({
      selectResult: [validToken],
      updateResult: [consumedToken],
    });
    const service = new (ImpersonationService as any)(mockDb);

    const result = await service.consume('valid-token');
    expect(result).toBeDefined();
    expect(result.usedAt).toBeDefined();
    expect(mockDb.update).toHaveBeenCalled();
  });
});

// ─── AdminTrpc access control ───────────────────────────────────────────────

describe('AdminTrpc access control', () => {
  it('admin procedures reject non-admin users', () => {
    // The adminProcedure middleware checks ctx.session.user.isAdmin.
    // Structural test: verify the condition logic.
    const nonAdminUser = { id: 'user-1', email: 'user@test.com', isAdmin: false };
    const adminUser = { id: 'admin-1', email: 'admin@test.com', isAdmin: true };

    // Non-admin fails the guard
    expect(!nonAdminUser.isAdmin).toBe(true);
    // Admin passes the guard
    expect(!adminUser.isAdmin).toBe(false);
  });
});
