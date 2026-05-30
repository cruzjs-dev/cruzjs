/**
 * Model Observers Unit Tests
 *
 * Tests for ObserverRegistry and withObservers helper.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObserverRegistry } from '../observer.registry';
import { withObservers } from '../with-observers';
import type { IModelObserver } from '../observer.interface';
import type { CruzDatabase } from '../../../shared/database/cruz-database';

// ─── Mock helpers ──────────────────────────────────────────────────────────

/**
 * Create a mock CruzDatabase with chainable insert/update/delete methods.
 */
function createMockDb(options?: {
  insertResult?: unknown;
  updateResult?: unknown;
}) {
  const insertResult = options?.insertResult ?? { id: 'new-1', name: 'Test' };
  const updateResult = options?.updateResult ?? { id: 'upd-1', name: 'Updated' };

  const insertReturning = vi.fn().mockResolvedValue([insertResult]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: insertValues });

  const updateReturning = vi.fn().mockResolvedValue([updateResult]);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: deleteWhere });

  return {
    db: {
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    } as unknown as CruzDatabase,
    mocks: {
      insert: mockInsert,
      insertValues,
      insertReturning,
      update: mockUpdate,
      updateSet,
      updateWhere,
      updateReturning,
      delete: mockDelete,
      deleteWhere,
    },
  };
}

/**
 * Fake table object that mimics a Drizzle table with an `id` column.
 * getTableName reads from Symbol.for('drizzle:Name') on the table object.
 */
function createFakeTable(name: string) {
  const table = {
    id: { name: 'id' },
    name: { name: 'name' },
    [Symbol.for('drizzle:Name')]: name,
    [Symbol.for('drizzle:Schema')]: undefined,
    [Symbol.for('drizzle:Columns')]: {},
    [Symbol.for('drizzle:ExtraConfigBuilder')]: undefined,
    [Symbol.for('drizzle:BaseColumn')]: undefined,
    [Symbol.for('drizzle:IsAlias')]: false,
    [Symbol.for('drizzle:OriginalName')]: name,
  };
  return table;
}

// ─── ObserverRegistry ──────────────────────────────────────────────────────

describe('ObserverRegistry', () => {
  let registry: ObserverRegistry;

  beforeEach(() => {
    registry = new ObserverRegistry();
  });

  it('should register and retrieve observers for a table', () => {
    const observer: IModelObserver = {
      creating: vi.fn(),
      created: vi.fn(),
    };

    registry.register('MyItems', observer);

    const observers = registry.getObservers('MyItems');
    expect(observers).toHaveLength(1);
    expect(observers[0]).toBe(observer);
  });

  it('should return empty array for unregistered table', () => {
    const observers = registry.getObservers('NonExistent');
    expect(observers).toEqual([]);
  });

  it('should support multiple observers for same table', () => {
    const obs1: IModelObserver = { creating: vi.fn() };
    const obs2: IModelObserver = { created: vi.fn() };
    const obs3: IModelObserver = { deleting: vi.fn() };

    registry.register('MyItems', obs1);
    registry.register('MyItems', obs2);
    registry.register('MyItems', obs3);

    const observers = registry.getObservers('MyItems');
    expect(observers).toHaveLength(3);
    expect(observers).toContain(obs1);
    expect(observers).toContain(obs2);
    expect(observers).toContain(obs3);
  });

  it('should track observers per table independently', () => {
    const obsA: IModelObserver = { creating: vi.fn() };
    const obsB: IModelObserver = { creating: vi.fn() };

    registry.register('TableA', obsA);
    registry.register('TableB', obsB);

    expect(registry.getObservers('TableA')).toEqual([obsA]);
    expect(registry.getObservers('TableB')).toEqual([obsB]);
  });

  it('should report hasObservers correctly', () => {
    expect(registry.hasObservers('MyItems')).toBe(false);

    registry.register('MyItems', { creating: vi.fn() });

    expect(registry.hasObservers('MyItems')).toBe(true);
    expect(registry.hasObservers('Other')).toBe(false);
  });

  it('should clear observers for a specific table', () => {
    registry.register('TableA', { creating: vi.fn() });
    registry.register('TableB', { creating: vi.fn() });

    registry.clear('TableA');

    expect(registry.hasObservers('TableA')).toBe(false);
    expect(registry.hasObservers('TableB')).toBe(true);
  });

  it('should clear all observers when called without arguments', () => {
    registry.register('TableA', { creating: vi.fn() });
    registry.register('TableB', { creating: vi.fn() });

    registry.clear();

    expect(registry.hasObservers('TableA')).toBe(false);
    expect(registry.hasObservers('TableB')).toBe(false);
  });
});

// ─── withObservers ─────────────────────────────────────────────────────────

describe('withObservers', () => {
  let registry: ObserverRegistry;

  beforeEach(() => {
    registry = new ObserverRegistry();
  });

  describe('insert', () => {
    it('should call creating before insert and created after', async () => {
      const callOrder: string[] = [];
      const observer: IModelObserver = {
        creating: vi.fn(() => {
          callOrder.push('creating');
        }),
        created: vi.fn(() => {
          callOrder.push('created');
        }),
      };

      const insertResult = { id: 'item-1', name: 'Test Item' };
      const { db, mocks } = createMockDb({ insertResult });

      // Track when the actual insert happens
      mocks.insertReturning.mockImplementation(() => {
        callOrder.push('db.insert');
        return Promise.resolve([insertResult]);
      });

      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      const result = await observed.insert(table as any, { name: 'Test Item' } as any);

      expect(result).toEqual(insertResult);
      expect(observer.creating).toHaveBeenCalledWith({ name: 'Test Item' });
      expect(observer.created).toHaveBeenCalledWith(insertResult);
      expect(callOrder).toEqual(['creating', 'db.insert', 'created']);
    });

    it('should work with no observers registered', async () => {
      const insertResult = { id: 'item-1', name: 'No Observer' };
      const { db } = createMockDb({ insertResult });
      const table = createFakeTable('MyItems');

      const observed = withObservers(db, registry);
      const result = await observed.insert(table as any, { name: 'No Observer' } as any);

      expect(result).toEqual(insertResult);
    });

    it('should abort insert when creating throws', async () => {
      const observer: IModelObserver = {
        creating: vi.fn(() => {
          throw new Error('Validation failed');
        }),
        created: vi.fn(),
      };

      const { db, mocks } = createMockDb();
      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      await expect(observed.insert(table as any, { name: 'Bad' } as any)).rejects.toThrow(
        'Validation failed',
      );

      // db.insert should never have been called
      expect(mocks.insert).not.toHaveBeenCalled();
      // created should never have been called
      expect(observer.created).not.toHaveBeenCalled();
    });

    it('should call multiple observers in registration order', async () => {
      const callOrder: string[] = [];
      const obs1: IModelObserver = {
        creating: vi.fn((): void => { callOrder.push('obs1-creating'); }),
        created: vi.fn((): void => { callOrder.push('obs1-created'); }),
      };
      const obs2: IModelObserver = {
        creating: vi.fn((): void => { callOrder.push('obs2-creating'); }),
        created: vi.fn((): void => { callOrder.push('obs2-created'); }),
      };

      const { db, mocks } = createMockDb();
      mocks.insertReturning.mockImplementation(() => {
        callOrder.push('db.insert');
        return Promise.resolve([{ id: '1' }]);
      });

      const table = createFakeTable('MyItems');
      registry.register('MyItems', obs1);
      registry.register('MyItems', obs2);
      const observed = withObservers(db, registry);

      await observed.insert(table as any, {} as any);

      expect(callOrder).toEqual([
        'obs1-creating',
        'obs2-creating',
        'db.insert',
        'obs1-created',
        'obs2-created',
      ]);
    });
  });

  describe('update', () => {
    it('should call updating before update and updated after', async () => {
      const callOrder: string[] = [];
      const observer: IModelObserver = {
        updating: vi.fn((): void => { callOrder.push('updating'); }),
        updated: vi.fn((): void => { callOrder.push('updated'); }),
      };

      const updateResult = { id: 'item-1', name: 'Updated' };
      const { db, mocks } = createMockDb({ updateResult });
      mocks.updateReturning.mockImplementation(() => {
        callOrder.push('db.update');
        return Promise.resolve([updateResult]);
      });

      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      const result = await observed.update(table as any, 'item-1', { name: 'Updated' });

      expect(result).toEqual(updateResult);
      expect(observer.updating).toHaveBeenCalledWith('item-1', { name: 'Updated' });
      expect(observer.updated).toHaveBeenCalledWith(updateResult);
      expect(callOrder).toEqual(['updating', 'db.update', 'updated']);
    });

    it('should return null and skip updated when record not found', async () => {
      const observer: IModelObserver = {
        updating: vi.fn(),
        updated: vi.fn(),
      };

      const { db, mocks } = createMockDb();
      mocks.updateReturning.mockResolvedValue([]);

      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      const result = await observed.update(table as any, 'non-existent', { name: 'x' });

      expect(result).toBeNull();
      expect(observer.updating).toHaveBeenCalledWith('non-existent', { name: 'x' });
      expect(observer.updated).not.toHaveBeenCalled();
    });

    it('should work with no observers registered', async () => {
      const updateResult = { id: 'item-1', name: 'Updated' };
      const { db } = createMockDb({ updateResult });
      const table = createFakeTable('MyItems');

      const observed = withObservers(db, registry);
      const result = await observed.update(table as any, 'item-1', { name: 'Updated' });

      expect(result).toEqual(updateResult);
    });
  });

  describe('delete', () => {
    it('should call deleting before delete and deleted after', async () => {
      const callOrder: string[] = [];
      const observer: IModelObserver = {
        deleting: vi.fn((): void => { callOrder.push('deleting'); }),
        deleted: vi.fn((): void => { callOrder.push('deleted'); }),
      };

      const { db, mocks } = createMockDb();
      mocks.deleteWhere.mockImplementation(() => {
        callOrder.push('db.delete');
        return Promise.resolve(undefined);
      });

      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      await observed.delete(table as any, 'item-1');

      expect(observer.deleting).toHaveBeenCalledWith('item-1');
      expect(observer.deleted).toHaveBeenCalledWith('item-1');
      expect(callOrder).toEqual(['deleting', 'db.delete', 'deleted']);
    });

    it('should abort delete when deleting throws', async () => {
      const observer: IModelObserver = {
        deleting: vi.fn(() => {
          throw new Error('Cannot delete protected record');
        }),
        deleted: vi.fn(),
      };

      const { db, mocks } = createMockDb();
      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      await expect(observed.delete(table as any, 'item-1')).rejects.toThrow(
        'Cannot delete protected record',
      );

      // db.delete should never have been called
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(observer.deleted).not.toHaveBeenCalled();
    });

    it('should work with no observers registered', async () => {
      const { db, mocks } = createMockDb();
      const table = createFakeTable('MyItems');

      const observed = withObservers(db, registry);
      await observed.delete(table as any, 'item-1');

      expect(mocks.delete).toHaveBeenCalled();
    });
  });

  describe('async observers', () => {
    it('should await async creating hooks', async () => {
      const callOrder: string[] = [];
      const observer: IModelObserver = {
        creating: vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 10));
          callOrder.push('async-creating');
        }),
      };

      const { db, mocks } = createMockDb();
      mocks.insertReturning.mockImplementation(() => {
        callOrder.push('db.insert');
        return Promise.resolve([{ id: '1' }]);
      });

      const table = createFakeTable('MyItems');
      registry.register('MyItems', observer);
      const observed = withObservers(db, registry);

      await observed.insert(table as any, {} as any);

      expect(callOrder).toEqual(['async-creating', 'db.insert']);
    });
  });
});
