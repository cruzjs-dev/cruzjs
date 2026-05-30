/**
 * Multi-Database Unit Tests
 *
 * Tests for connection registration, role-based routing,
 * round-robin replica selection, health checks, and decorators.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiDatabaseService } from '../multi-database.service';
import { MultiDatabaseHealthCheck } from '../multi-database.health';
import { UseConnection, getConnectionRoute } from '../use-connection.decorator';
import { ConnectionRole } from '../multi-database.types';

// ─── Mock DrizzleDatabase ────────────────────────────────────────────────────

function createMockDb(name: string) {
  return {
    _name: name,
    run: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as any;
}

// ─── MultiDatabaseService ────────────────────────────────────────────────────

describe('MultiDatabaseService', () => {
  let service: MultiDatabaseService;
  let primaryDb: any;

  beforeEach(() => {
    primaryDb = createMockDb('injected-primary');
    // Construct without DI — pass primary db directly
    service = new MultiDatabaseService(primaryDb);
  });

  it('register() adds connection to map', () => {
    const db = createMockDb('test-db');
    service.register('test', db, ConnectionRole.PRIMARY);

    const connections = service.list();
    expect(connections).toHaveLength(1);
    expect(connections[0]).toEqual({ name: 'test', role: 'primary' });
  });

  it('connection() returns correct connection by name', () => {
    const db = createMockDb('my-db');
    service.register('my-db', db, ConnectionRole.PRIMARY);

    const result = service.connection('my-db');
    expect(result).toBe(db);
  });

  it('connection() throws on unknown name', () => {
    expect(() => service.connection('nonexistent')).toThrow(
      'Database connection "nonexistent" is not registered',
    );
  });

  it('primary() returns primary or falls back to injected db', () => {
    // No connections registered — should fall back to injected primary
    expect(service.primary()).toBe(primaryDb);

    // Register a primary connection
    const customPrimary = createMockDb('custom-primary');
    service.register('main', customPrimary, ConnectionRole.PRIMARY);

    expect(service.primary()).toBe(customPrimary);
  });

  it('replica() round-robins when multiple replicas', () => {
    const replica1 = createMockDb('replica-1');
    const replica2 = createMockDb('replica-2');
    const replica3 = createMockDb('replica-3');

    service.register('replica-1', replica1, ConnectionRole.REPLICA);
    service.register('replica-2', replica2, ConnectionRole.REPLICA);
    service.register('replica-3', replica3, ConnectionRole.REPLICA);

    const first = service.replica();
    const second = service.replica();
    const third = service.replica();
    const fourth = service.replica(); // wraps around

    expect(first).toBe(replica1);
    expect(second).toBe(replica2);
    expect(third).toBe(replica3);
    expect(fourth).toBe(replica1);
  });

  it('replica() falls back to primary when no replicas registered', () => {
    const customPrimary = createMockDb('custom-primary');
    service.register('main', customPrimary, ConnectionRole.PRIMARY);

    expect(service.replica()).toBe(customPrimary);
  });

  it('analytics() returns analytics connection', () => {
    const analyticsDb = createMockDb('analytics');
    service.register('analytics', analyticsDb, ConnectionRole.ANALYTICS);

    expect(service.analytics()).toBe(analyticsDb);
  });

  it('analytics() falls back to primary when no analytics registered', () => {
    expect(service.analytics()).toBe(primaryDb);
  });

  it('withPrimary() executes on primary connection', async () => {
    const customPrimary = createMockDb('custom-primary');
    service.register('main', customPrimary, ConnectionRole.PRIMARY);

    const result = await service.withPrimary(async (db) => {
      expect(db).toBe(customPrimary);
      return 'done';
    });

    expect(result).toBe('done');
  });

  it('withReplica() executes on replica connection', async () => {
    const replica = createMockDb('replica');
    service.register('read', replica, ConnectionRole.REPLICA);

    const result = await service.withReplica(async (db) => {
      expect(db).toBe(replica);
      return 42;
    });

    expect(result).toBe(42);
  });

  it('list() returns all connections with roles', () => {
    service.register('primary', createMockDb('p'), ConnectionRole.PRIMARY);
    service.register('replica-1', createMockDb('r1'), ConnectionRole.REPLICA);
    service.register('replica-2', createMockDb('r2'), ConnectionRole.REPLICA);
    service.register('analytics', createMockDb('a'), ConnectionRole.ANALYTICS);

    const connections = service.list();
    expect(connections).toHaveLength(4);
    expect(connections).toEqual([
      { name: 'primary', role: 'primary' },
      { name: 'replica-1', role: 'replica' },
      { name: 'replica-2', role: 'replica' },
      { name: 'analytics', role: 'analytics' },
    ]);
  });
});

// ─── MultiDatabaseHealthCheck ────────────────────────────────────────────────

describe('MultiDatabaseHealthCheck', () => {
  let service: MultiDatabaseService;
  let healthCheck: MultiDatabaseHealthCheck;

  beforeEach(() => {
    const primaryDb = createMockDb('primary');
    service = new MultiDatabaseService(primaryDb);
    healthCheck = new MultiDatabaseHealthCheck(service);
  });

  it('check() returns healthy when all connections OK', async () => {
    const db1 = createMockDb('primary');
    const db2 = createMockDb('replica');
    service.register('primary', db1, ConnectionRole.PRIMARY);
    service.register('replica', db2, ConnectionRole.REPLICA);

    const result = await healthCheck.check();
    expect(result.status).toBe('healthy');
    expect(result.message).toContain('2 database connections healthy');
  });

  it('check() returns degraded when replica fails', async () => {
    const db1 = createMockDb('primary');
    const db2 = createMockDb('replica');
    db2.run = vi.fn().mockRejectedValue(new Error('Replica connection refused'));

    service.register('primary', db1, ConnectionRole.PRIMARY);
    service.register('replica', db2, ConnectionRole.REPLICA);

    const result = await healthCheck.check();
    expect(result.status).toBe('degraded');
    expect(result.message).toContain('replica/analytics connections failed');
    expect(result.details).toBeDefined();
    expect((result.details as any)['replica'].status).toBe('unhealthy');
  });

  it('check() returns unhealthy when primary fails', async () => {
    const db1 = createMockDb('primary');
    db1.run = vi.fn().mockRejectedValue(new Error('Primary down'));

    service.register('primary', db1, ConnectionRole.PRIMARY);

    const result = await healthCheck.check();
    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('Primary database connection failed');
  });

  it('check() returns healthy when no connections registered', async () => {
    const result = await healthCheck.check();
    expect(result.status).toBe('healthy');
    expect(result.message).toContain('No additional database connections registered');
  });
});

// ─── UseConnection Decorator ─────────────────────────────────────────────────

describe('UseConnection decorator', () => {
  it('stores metadata on method', () => {
    class TestService {
      @UseConnection('analytics')
      async generateReport() {
        return [];
      }
    }

    const instance = new TestService();
    const route = getConnectionRoute(instance, 'generateReport');
    expect(route).toBe('analytics');
  });

  it('stores ConnectionRole metadata', () => {
    class TestService {
      @UseConnection(ConnectionRole.REPLICA)
      async readData() {
        return {};
      }
    }

    const instance = new TestService();
    const route = getConnectionRoute(instance, 'readData');
    expect(route).toBe('replica');
  });

  it('returns undefined for undecorated methods', () => {
    class TestService {
      async plainMethod() {
        return null;
      }
    }

    const instance = new TestService();
    const route = getConnectionRoute(instance, 'plainMethod');
    expect(route).toBeUndefined();
  });
});
