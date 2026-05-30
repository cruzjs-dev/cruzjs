import { testAdapterContract } from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { CloudflareAdapter } from '../cloudflare-adapter';

describe('CloudflareAdapter', () => {
  testAdapterContract(() => new CloudflareAdapter(), 'cloudflare', 'edge', {
    bindingsFromPlatformContext: true,
  });

  describe('cloudflare-specific behavior', () => {
    it('init bridges string env values to process.env', async () => {
      const adapter = new CloudflareAdapter();
      const uniqueKey = `CF_TEST_${Date.now()}`;
      await adapter.init({
        cloudflare: { env: { [uniqueKey]: 'bridged-value', DB: {} } },
      });
      try {
        expect(process.env[uniqueKey]).toBe('bridged-value');
      } finally {
        delete process.env[uniqueKey];
        adapter.clear();
      }
    });

    it('getDatabase returns the DB binding from cloudflare env', async () => {
      const adapter = new CloudflareAdapter();
      const fakeDb = { prepare: vi.fn() };
      await adapter.init({ cloudflare: { env: { DB: fakeDb } } });
      expect(adapter.getDatabase()).toBe(fakeDb);
      adapter.clear();
    });

    it('getDatabase returns null when no cloudflare env', () => {
      const adapter = new CloudflareAdapter();
      expect(adapter.getDatabase()).toBeNull();
    });

    it('getBinding returns cloudflare env bindings', async () => {
      const adapter = new CloudflareAdapter();
      const kvBinding = { get: vi.fn(), put: vi.fn() };
      await adapter.init({ cloudflare: { env: { MY_KV: kvBinding } } });
      expect(adapter.getBinding('MY_KV')).toBe(kvBinding);
      adapter.clear();
    });

    it('getStorageBucket returns R2 binding when configured', async () => {
      const adapter = new CloudflareAdapter();
      const r2Bucket = { put: vi.fn() };
      await adapter.init({
        cloudflare: { env: { UPLOADS_BUCKET: r2Bucket } },
      });
      expect(adapter.getStorageBucket()).toBe(r2Bucket);
      adapter.clear();
    });

    it('getStorageBucket falls back to STORAGE binding', async () => {
      const adapter = new CloudflareAdapter();
      const storageBucket = { put: vi.fn() };
      await adapter.init({
        cloudflare: { env: { STORAGE: storageBucket } },
      });
      expect(adapter.getStorageBucket()).toBe(storageBucket);
      adapter.clear();
    });

    it('supports custom KV and R2 binding names via config', async () => {
      const adapter = new CloudflareAdapter({
        kvBindingName: 'CUSTOM_KV',
        r2BindingName: 'CUSTOM_R2',
      });
      const customKv = { get: vi.fn(), put: vi.fn(), delete: vi.fn(), list: vi.fn() };
      const customR2 = { put: vi.fn() };
      await adapter.init({
        cloudflare: { env: { CUSTOM_KV: customKv, CUSTOM_R2: customR2 } },
      });
      expect(adapter.getStorageBucket()).toBe(customR2);
      adapter.clear();
    });

    it('diagnostics includes cloudflare-specific fields', async () => {
      const adapter = new CloudflareAdapter();
      await adapter.init({
        cloudflare: { env: { DB: {}, CACHE_KV: {}, AI: {} } },
      });
      const diag = adapter.diagnostics;
      expect(diag.hasEnv).toBe(true);
      expect(diag.hasDB).toBe(true);
      expect(diag.hasCacheKV).toBe(true);
      expect(diag.hasAI).toBe(true);
      expect(Array.isArray(diag.envKeys)).toBe(true);
      adapter.clear();
    });

    it('clear resets cfEnv so getDatabase returns null', async () => {
      const adapter = new CloudflareAdapter();
      await adapter.init({ cloudflare: { env: { DB: {} } } });
      expect(adapter.getDatabase()).not.toBeNull();
      adapter.clear();
      expect(adapter.getDatabase()).toBeNull();
    });

    it('uses real CF queue binding when available', async () => {
      const adapter = new CloudflareAdapter();
      const mockCfQueue = {
        send: vi.fn().mockResolvedValue(undefined),
        sendBatch: vi.fn().mockResolvedValue(undefined),
      };
      await adapter.init({
        cloudflare: { env: { MY_QUEUE: mockCfQueue } },
      });
      const queue = adapter.getQueue('MY_QUEUE');
      await queue.send({ data: 'test' });
      expect(mockCfQueue.send).toHaveBeenCalledWith({ data: 'test' });
      adapter.clear();
    });
  });
});
