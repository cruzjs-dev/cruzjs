import {
  testAdapterContract,
  testFlushPendingWork,
} from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { AzureFunctionsAdapter } from '../functions-adapter';

describe('AzureFunctionsAdapter', () => {
  testAdapterContract(
    () => new AzureFunctionsAdapter(),
    'azure-functions',
    'serverless',
  );

  testFlushPendingWork(() => new AzureFunctionsAdapter());

  describe('azure-functions-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new AzureFunctionsAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new AzureFunctionsAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config containerName', () => {
      const adapter = new AzureFunctionsAdapter({ containerName: 'my-container' });
      expect(adapter.getStorageBucket()).toBe('my-container');
    });

    it('getStorageBucket falls back to process.env.AZURE_CONTAINER_NAME', () => {
      process.env.AZURE_CONTAINER_NAME = 'env-container';
      try {
        const adapter = new AzureFunctionsAdapter();
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
        const adapter = new AzureFunctionsAdapter();
        const ai = adapter.getAI();
        expect(ai).not.toBeNull();
      } finally {
        delete process.env.AZURE_OPENAI_API_KEY;
        if (saved) process.env.OPENAI_API_KEY = saved;
      }
    });

    it('diagnostics includes azure-specific fields', () => {
      const adapter = new AzureFunctionsAdapter({
        databaseUrl: 'pg://x',
        containerName: 'c',
      });
      const diag = adapter.diagnostics;
      expect(diag.adapter).toBe('azure-functions');
      expect(diag.hasDatabaseUrl).toBe(true);
      expect(diag.hasStorage).toBe(true);
    });

    it('clear resets pending work', async () => {
      const adapter = new AzureFunctionsAdapter();
      adapter.waitUntil(Promise.resolve());
      adapter.clear();
      await expect(adapter.flushPendingWork()).resolves.toBeUndefined();
    });
  });
});
