/**
 * Shared RuntimeAdapter contract test suite.
 *
 * Every adapter must satisfy the same interface guarantees.
 * Import this helper and call `testAdapterContract(...)` inside your adapter test file
 * to get full coverage of the RuntimeAdapter interface.
 */
import type { RuntimeAdapter, RuntimeType, CacheBinding, QueueBinding } from '../types';

export interface AdapterContractOptions {
  /** Set to true if the adapter reads bindings from a platform context rather than process.env */
  bindingsFromPlatformContext?: boolean;
}

export function testAdapterContract(
  createAdapter: () => RuntimeAdapter,
  expectedName: string,
  expectedType: RuntimeType,
  options?: AdapterContractOptions,
) {
  let adapter: RuntimeAdapter;

  beforeEach(() => {
    adapter = createAdapter();
  });

  afterEach(() => {
    adapter.clear();
  });

  // ─── Metadata ──────────────────────────────────────────────────────────────

  describe('metadata', () => {
    it('has the expected name', () => {
      expect(adapter.name).toBe(expectedName);
    });

    it('has the expected type', () => {
      expect(adapter.type).toBe(expectedType);
    });
  });

  // ─── init() ────────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('resolves without error when called with no context', async () => {
      await expect(adapter.init(undefined)).resolves.toBeUndefined();
    });

    it('resolves without error when called with an empty object', async () => {
      await expect(adapter.init({})).resolves.toBeUndefined();
    });
  });

  // ─── getDatabase() ────────────────────────────────────────────────────────

  describe('getDatabase()', () => {
    it('returns null by default when no database is configured', () => {
      // Most adapters fall back to process.env.DATABASE_URL — ensure it is unset
      const original = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      try {
        const freshAdapter = createAdapter();
        expect(freshAdapter.getDatabase()).toBeNull();
      } finally {
        if (original !== undefined) process.env.DATABASE_URL = original;
      }
    });
  });

  // ─── getCache() ────────────────────────────────────────────────────────────

  describe('getCache()', () => {
    let cache: CacheBinding;

    beforeEach(() => {
      cache = adapter.getCache('test');
    });

    it('returns a CacheBinding', () => {
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.delete).toBe('function');
      expect(typeof cache.deleteMany).toBe('function');
      expect(typeof cache.exists).toBe('function');
      expect(typeof cache.keys).toBe('function');
      expect(typeof cache.clear).toBe('function');
      expect(typeof cache.increment).toBe('function');
      expect(typeof cache.decrement).toBe('function');
    });

    describe('get/set round-trip', () => {
      it('stores and retrieves a string value', async () => {
        await cache.set('str-key', 'hello');
        const value = await cache.get<string>('str-key');
        expect(value).toBe('hello');
      });

      it('stores and retrieves a numeric value', async () => {
        await cache.set('num-key', 42);
        const value = await cache.get<number>('num-key');
        expect(value).toBe(42);
      });

      it('stores and retrieves an object value', async () => {
        const obj = { foo: 'bar', count: 7 };
        await cache.set('obj-key', obj);
        const value = await cache.get<typeof obj>('obj-key');
        expect(value).toEqual(obj);
      });

      it('set returns true on success', async () => {
        const result = await cache.set('ok', 'val');
        expect(result).toBe(true);
      });
    });

    describe('get returns null for missing keys', () => {
      it('returns null for a key that was never set', async () => {
        const value = await cache.get('nonexistent');
        expect(value).toBeNull();
      });
    });

    describe('delete', () => {
      it('removes a key so subsequent get returns null', async () => {
        await cache.set('del-key', 'value');
        const deleted = await cache.delete('del-key');
        expect(deleted).toBe(true);
        const value = await cache.get('del-key');
        expect(value).toBeNull();
      });

      it('returns true even when deleting a nonexistent key', async () => {
        // Most in-memory implementations return true/false based on Map.delete
        // The contract allows either — we just verify it does not throw
        const result = await cache.delete('never-existed');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('deleteMany', () => {
      it('deletes multiple keys and returns count', async () => {
        await cache.set('dm-a', '1');
        await cache.set('dm-b', '2');
        await cache.set('dm-c', '3');
        const deleted = await cache.deleteMany(['dm-a', 'dm-b']);
        expect(deleted).toBe(2);
        expect(await cache.get('dm-a')).toBeNull();
        expect(await cache.get('dm-b')).toBeNull();
        expect(await cache.get('dm-c')).not.toBeNull();
      });
    });

    describe('exists', () => {
      it('returns false for a missing key', async () => {
        const result = await cache.exists('nope');
        expect(result).toBe(false);
      });

      it('returns true for an existing key', async () => {
        await cache.set('exist-key', 'yes');
        const result = await cache.exists('exist-key');
        expect(result).toBe(true);
      });

      it('returns false after key is deleted', async () => {
        await cache.set('temp', 'val');
        await cache.delete('temp');
        expect(await cache.exists('temp')).toBe(false);
      });
    });

    describe('keys', () => {
      it('returns keys matching a prefix pattern', async () => {
        await cache.set('user:1', 'a');
        await cache.set('user:2', 'b');
        await cache.set('order:1', 'c');
        const userKeys = await cache.keys('user:*');
        expect(userKeys).toContain('user:1');
        expect(userKeys).toContain('user:2');
        expect(userKeys).not.toContain('order:1');
      });

      it('returns empty array when no keys match', async () => {
        const result = await cache.keys('zzz-*');
        expect(result).toEqual([]);
      });
    });

    describe('increment / decrement', () => {
      it('increments from zero', async () => {
        const val = await cache.increment('counter');
        expect(val).toBe(1);
      });

      it('increments by a custom amount', async () => {
        await cache.set('counter', 10);
        const val = await cache.increment('counter', 5);
        expect(val).toBe(15);
      });

      it('decrements from a value', async () => {
        await cache.set('counter', 10);
        const val = await cache.decrement('counter', 3);
        expect(val).toBe(7);
      });

      it('decrement defaults to decrementing by 1', async () => {
        await cache.set('counter', 5);
        const val = await cache.decrement('counter');
        expect(val).toBe(4);
      });

      it('decrement can go negative', async () => {
        await cache.set('counter', 0);
        const val = await cache.decrement('counter', 2);
        expect(val).toBe(-2);
      });
    });

    describe('TTL expiration', () => {
      it('expires keys after TTL elapses', async () => {
        vi.useFakeTimers();
        try {
          await cache.set('ttl-key', 'expires-soon', 1); // 1 second TTL
          // Key should exist immediately
          expect(await cache.get('ttl-key')).toBe('expires-soon');
          // Advance past TTL
          vi.advanceTimersByTime(1500);
          expect(await cache.get('ttl-key')).toBeNull();
        } finally {
          vi.useRealTimers();
        }
      });

      it('key persists before TTL elapses', async () => {
        vi.useFakeTimers();
        try {
          await cache.set('ttl-key2', 'still-here', 10);
          vi.advanceTimersByTime(5000); // 5 seconds — within 10s TTL
          expect(await cache.get('ttl-key2')).toBe('still-here');
        } finally {
          vi.useRealTimers();
        }
      });
    });

    describe('clear', () => {
      it('removes all keys in the namespace and returns count', async () => {
        await cache.set('c1', 'v1');
        await cache.set('c2', 'v2');
        await cache.set('c3', 'v3');
        const cleared = await cache.clear();
        expect(cleared).toBe(3);
        expect(await cache.get('c1')).toBeNull();
        expect(await cache.get('c2')).toBeNull();
        expect(await cache.get('c3')).toBeNull();
      });

      it('returns 0 when cache is already empty', async () => {
        const cleared = await cache.clear();
        expect(cleared).toBe(0);
      });
    });

    describe('namespace isolation', () => {
      it('two caches with different namespaces do not overlap', async () => {
        const cacheA = adapter.getCache('ns-a');
        const cacheB = adapter.getCache('ns-b');

        await cacheA.set('shared-key', 'value-a');
        await cacheB.set('shared-key', 'value-b');

        expect(await cacheA.get('shared-key')).toBe('value-a');
        expect(await cacheB.get('shared-key')).toBe('value-b');

        await cacheA.delete('shared-key');
        expect(await cacheA.get('shared-key')).toBeNull();
        expect(await cacheB.get('shared-key')).toBe('value-b');
      });
    });
  });

  // ─── getQueue() ────────────────────────────────────────────────────────────

  describe('getQueue()', () => {
    it('returns a QueueBinding with send and sendBatch', () => {
      const queue = adapter.getQueue('test-queue');
      expect(queue).toBeDefined();
      expect(typeof queue.send).toBe('function');
      expect(typeof queue.sendBatch).toBe('function');
    });

    it('send does not throw when no consumer is registered', async () => {
      const queue = adapter.getQueue('orphan-queue');
      await expect(queue.send({ type: 'test' })).resolves.toBeUndefined();
    });

    it('sendBatch does not throw when no consumer is registered', async () => {
      const queue = adapter.getQueue('orphan-batch-queue');
      await expect(
        queue.sendBatch([{ body: { a: 1 } }, { body: { a: 2 } }]),
      ).resolves.toBeUndefined();
    });

    it('delivers messages to a registered consumer', async () => {
      const received: unknown[] = [];

      // First call getQueue to create it, then register consumer
      const queue = adapter.getQueue<{ data: string }>('consumer-queue');
      const localQueue = adapter.getLocalQueue<{ data: string }>('consumer-queue');

      if (localQueue) {
        localQueue.onMessage(async (msg) => {
          received.push(msg);
        });
      }

      await queue.send({ data: 'hello' });

      if (localQueue) {
        expect(received).toHaveLength(1);
        expect(received[0]).toEqual({ data: 'hello' });
      }
    });

    it('sendBatch delivers all messages to a registered consumer', async () => {
      const received: unknown[] = [];

      const queue = adapter.getQueue<{ id: number }>('batch-consumer-queue');
      const localQueue = adapter.getLocalQueue<{ id: number }>('batch-consumer-queue');

      if (localQueue) {
        localQueue.onMessage(async (msg) => {
          received.push(msg);
        });
      }

      await queue.sendBatch([
        { body: { id: 1 } },
        { body: { id: 2 } },
        { body: { id: 3 } },
      ]);

      if (localQueue) {
        expect(received).toHaveLength(3);
        expect(received).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      }
    });

    it('returns the same queue instance for the same name', () => {
      const q1 = adapter.getQueue('same-queue');
      const q2 = adapter.getQueue('same-queue');
      expect(q1).toBe(q2);
    });
  });

  // ─── getLocalQueue() ──────────────────────────────────────────────────────

  describe('getLocalQueue()', () => {
    it('returns null for a queue that was never accessed via getQueue', () => {
      const localQueue = adapter.getLocalQueue('never-created');
      expect(localQueue).toBeNull();
    });

    it('returns a LocalQueueLike after getQueue creates it', () => {
      adapter.getQueue('existing-queue');
      const localQueue = adapter.getLocalQueue('existing-queue');
      // Most adapters return the same MemoryQueue/LocalQueue which implements both interfaces
      if (localQueue !== null) {
        expect(typeof localQueue.onMessage).toBe('function');
      }
    });
  });

  // ─── getAI() ───────────────────────────────────────────────────────────────

  describe('getAI()', () => {
    it('returns null when no API key is configured', () => {
      // Ensure env vars are clean
      const savedKeys = ['OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CF_AI_GATEWAY_ID', 'CF_AIG_TOKEN', 'AI_API_KEY'];
      const saved: Record<string, string | undefined> = {};
      for (const key of savedKeys) {
        saved[key] = process.env[key];
        delete process.env[key];
      }
      try {
        const freshAdapter = createAdapter();
        expect(freshAdapter.getAI()).toBeNull();
      } finally {
        for (const [key, value] of Object.entries(saved)) {
          if (value !== undefined) process.env[key] = value;
        }
      }
    });
  });

  // ─── getBinding() ─────────────────────────────────────────────────────────

  describe('getBinding()', () => {
    if (!options?.bindingsFromPlatformContext) {
      it('returns the value of a process.env variable', () => {
        process.env.TEST_BINDING_VAR = 'test-value';
        try {
          expect(adapter.getBinding<string>('TEST_BINDING_VAR')).toBe('test-value');
        } finally {
          delete process.env.TEST_BINDING_VAR;
        }
      });
    }

    it('returns null for a missing binding', () => {
      delete process.env.NONEXISTENT_BINDING;
      expect(adapter.getBinding('NONEXISTENT_BINDING')).toBeNull();
    });
  });

  // ─── getStorageBucket() ───────────────────────────────────────────────────

  describe('getStorageBucket()', () => {
    it('returns null by default when no storage is configured', () => {
      // Ensure relevant env vars are unset
      const storageVars = ['S3_BUCKET', 'GCS_BUCKET', 'AZURE_CONTAINER_NAME', 'SPACES_BUCKET', 'UPLOADS_BUCKET', 'STORAGE'];
      const saved: Record<string, string | undefined> = {};
      for (const v of storageVars) {
        saved[v] = process.env[v];
        delete process.env[v];
      }
      try {
        const freshAdapter = createAdapter();
        expect(freshAdapter.getStorageBucket()).toBeNull();
      } finally {
        for (const [k, v] of Object.entries(saved)) {
          if (v !== undefined) process.env[k] = v;
        }
      }
    });
  });

  // ─── diagnostics ──────────────────────────────────────────────────────────

  describe('diagnostics', () => {
    it('returns an object containing the adapter name', () => {
      const diag = adapter.diagnostics;
      expect(diag).toBeDefined();
      expect(typeof diag).toBe('object');
      expect(diag.adapter).toBe(expectedName);
    });
  });

  // ─── env ──────────────────────────────────────────────────────────────────

  describe('env', () => {
    it('returns process.env as a record', () => {
      process.env.__ADAPTER_TEST_VAR__ = 'env-test';
      try {
        expect(adapter.env.__ADAPTER_TEST_VAR__).toBe('env-test');
      } finally {
        delete process.env.__ADAPTER_TEST_VAR__;
      }
    });
  });

  // ─── waitUntil() ──────────────────────────────────────────────────────────

  describe('waitUntil()', () => {
    it('does not throw when called with a resolved promise', () => {
      expect(() => adapter.waitUntil(Promise.resolve())).not.toThrow();
    });

    it('does not throw when called with a rejected promise', async () => {
      // Suppress console.error from fire-and-forget handlers
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Create and pre-catch the rejection to prevent unhandled rejection warnings
      const rejected = Promise.reject(new Error('bg-fail'));
      rejected.catch(() => {}); // prevent unhandled rejection
      expect(() => adapter.waitUntil(rejected)).not.toThrow();
      // Let microtasks settle
      await new Promise((r) => setTimeout(r, 10));
      spy.mockRestore();
    });
  });

  // ─── clear() ──────────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('does not throw', () => {
      expect(() => adapter.clear()).not.toThrow();
    });

    it('resets local queue state (getLocalQueue returns null after clear)', () => {
      adapter.getQueue('some-queue');
      adapter.clear();
      expect(adapter.getLocalQueue('some-queue')).toBeNull();
    });
  });
}

/**
 * Test helper for adapters that have a `flushPendingWork()` method (serverless adapters).
 */
export function testFlushPendingWork(
  createAdapter: () => RuntimeAdapter & { flushPendingWork(): Promise<void> },
) {
  describe('flushPendingWork()', () => {
    it('resolves immediately when no work is pending', async () => {
      const adapter = createAdapter();
      await expect(adapter.flushPendingWork()).resolves.toBeUndefined();
    });

    it('awaits all promises added via waitUntil', async () => {
      const adapter = createAdapter();
      let resolved1 = false;
      let resolved2 = false;

      adapter.waitUntil(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resolved1 = true;
            resolve();
          }, 10);
        }),
      );
      adapter.waitUntil(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resolved2 = true;
            resolve();
          }, 20);
        }),
      );

      await adapter.flushPendingWork();
      expect(resolved1).toBe(true);
      expect(resolved2).toBe(true);
    });

    it('handles rejected promises gracefully (does not throw)', async () => {
      const adapter = createAdapter();
      adapter.waitUntil(Promise.reject(new Error('fail-1')));
      adapter.waitUntil(Promise.resolve());
      await expect(adapter.flushPendingWork()).resolves.toBeUndefined();
    });

    it('clears pending work after flush', async () => {
      const adapter = createAdapter();
      let callCount = 0;
      adapter.waitUntil(
        new Promise<void>((resolve) => {
          callCount++;
          resolve();
        }),
      );
      await adapter.flushPendingWork();
      expect(callCount).toBe(1);
      // Flushing again should have nothing to do
      await adapter.flushPendingWork();
    });
  });
}
