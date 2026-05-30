import { testAdapterContract } from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { DigitalOceanAppPlatformAdapter } from '../app-platform-adapter';

describe('DigitalOceanAppPlatformAdapter', () => {
  testAdapterContract(
    () => new DigitalOceanAppPlatformAdapter(),
    'digitalocean-app-platform',
    'container',
  );

  describe('digitalocean-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new DigitalOceanAppPlatformAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new DigitalOceanAppPlatformAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config spacesBucket', () => {
      const adapter = new DigitalOceanAppPlatformAdapter({ spacesBucket: 'my-space' });
      expect(adapter.getStorageBucket()).toBe('my-space');
    });

    it('getStorageBucket falls back to process.env.SPACES_BUCKET', () => {
      process.env.SPACES_BUCKET = 'env-space';
      try {
        const adapter = new DigitalOceanAppPlatformAdapter();
        expect(adapter.getStorageBucket()).toBe('env-space');
      } finally {
        delete process.env.SPACES_BUCKET;
      }
    });

    it('waitUntil fires and forgets (catches errors silently)', () => {
      const adapter = new DigitalOceanAppPlatformAdapter();
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adapter.waitUntil(Promise.reject(new Error('bg-error')));
      spy.mockRestore();
    });

    it('diagnostics includes DO-specific fields', () => {
      const adapter = new DigitalOceanAppPlatformAdapter({
        databaseUrl: 'pg://x',
        spacesBucket: 'b',
      });
      const diag = adapter.diagnostics;
      expect(diag.adapter).toBe('digitalocean-app-platform');
      expect(diag.hasDatabaseUrl).toBe(true);
      expect(diag.hasSpacesBucket).toBe(true);
    });
  });
});
