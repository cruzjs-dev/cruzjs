import { testAdapterContract } from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { AzureContainerAppsAdapter } from '../container-apps-adapter';

describe('AzureContainerAppsAdapter', () => {
  testAdapterContract(
    () => new AzureContainerAppsAdapter(),
    'azure-container-apps',
    'container',
  );

  describe('azure-container-apps-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new AzureContainerAppsAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new AzureContainerAppsAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config containerName', () => {
      const adapter = new AzureContainerAppsAdapter({ containerName: 'my-container' });
      expect(adapter.getStorageBucket()).toBe('my-container');
    });

    it('getStorageBucket falls back to process.env.AZURE_CONTAINER_NAME', () => {
      process.env.AZURE_CONTAINER_NAME = 'env-container';
      try {
        const adapter = new AzureContainerAppsAdapter();
        expect(adapter.getStorageBucket()).toBe('env-container');
      } finally {
        delete process.env.AZURE_CONTAINER_NAME;
      }
    });

    it('getAI checks AZURE_OPENAI_API_KEY as fallback', () => {
      const saved = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      process.env.AZURE_OPENAI_API_KEY = 'azure-key';
      try {
        const adapter = new AzureContainerAppsAdapter();
        expect(adapter.getAI()).not.toBeNull();
      } finally {
        delete process.env.AZURE_OPENAI_API_KEY;
        if (saved) process.env.OPENAI_API_KEY = saved;
      }
    });

    it('waitUntil fires and forgets (catches errors silently)', () => {
      const adapter = new AzureContainerAppsAdapter();
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adapter.waitUntil(Promise.reject(new Error('bg-error')));
      spy.mockRestore();
    });

    it('diagnostics includes azure-specific fields', () => {
      const adapter = new AzureContainerAppsAdapter({
        databaseUrl: 'pg://x',
        containerName: 'c',
      });
      const diag = adapter.diagnostics;
      expect(diag.adapter).toBe('azure-container-apps');
      expect(diag.hasDatabaseUrl).toBe(true);
      expect(diag.hasStorage).toBe(true);
    });
  });
});
