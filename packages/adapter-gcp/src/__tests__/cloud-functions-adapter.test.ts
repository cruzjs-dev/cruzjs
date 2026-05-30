import {
  testAdapterContract,
  testFlushPendingWork,
} from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { GCPCloudFunctionsAdapter } from '../cloud-functions-adapter';

describe('GCPCloudFunctionsAdapter', () => {
  testAdapterContract(
    () => new GCPCloudFunctionsAdapter(),
    'gcp-cloud-functions',
    'serverless',
  );

  testFlushPendingWork(() => new GCPCloudFunctionsAdapter());

  describe('gcp-cloud-functions-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new GCPCloudFunctionsAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new GCPCloudFunctionsAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config gcsBucket', () => {
      const adapter = new GCPCloudFunctionsAdapter({ gcsBucket: 'gcs-bucket' });
      expect(adapter.getStorageBucket()).toBe('gcs-bucket');
    });

    it('getStorageBucket falls back to process.env.GCS_BUCKET', () => {
      process.env.GCS_BUCKET = 'env-gcs-bucket';
      try {
        const adapter = new GCPCloudFunctionsAdapter();
        expect(adapter.getStorageBucket()).toBe('env-gcs-bucket');
      } finally {
        delete process.env.GCS_BUCKET;
      }
    });

    it('diagnostics includes function-specific fields', () => {
      const adapter = new GCPCloudFunctionsAdapter({ databaseUrl: 'pg://x', gcsBucket: 'b' });
      const diag = adapter.diagnostics;
      expect(diag.adapter).toBe('gcp-cloud-functions');
      expect(diag.hasDatabaseUrl).toBe(true);
      expect(diag.hasGCSBucket).toBe(true);
    });

    it('clear resets pending work', async () => {
      const adapter = new GCPCloudFunctionsAdapter();
      adapter.waitUntil(Promise.resolve());
      adapter.clear();
      await expect(adapter.flushPendingWork()).resolves.toBeUndefined();
    });
  });
});
