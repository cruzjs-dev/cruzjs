import { testAdapterContract } from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { GCPCloudRunAdapter } from '../cloud-run-adapter';

describe('GCPCloudRunAdapter', () => {
  testAdapterContract(() => new GCPCloudRunAdapter(), 'gcp-cloud-run', 'container');

  describe('gcp-cloud-run-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new GCPCloudRunAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new GCPCloudRunAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config gcsBucket', () => {
      const adapter = new GCPCloudRunAdapter({ gcsBucket: 'my-gcs-bucket' });
      expect(adapter.getStorageBucket()).toBe('my-gcs-bucket');
    });

    it('getStorageBucket falls back to process.env.GCS_BUCKET', () => {
      process.env.GCS_BUCKET = 'env-gcs-bucket';
      try {
        const adapter = new GCPCloudRunAdapter();
        expect(adapter.getStorageBucket()).toBe('env-gcs-bucket');
      } finally {
        delete process.env.GCS_BUCKET;
      }
    });

    it('waitUntil fires and forgets when cpuAlwaysAllocated is true', () => {
      const adapter = new GCPCloudRunAdapter({ cpuAlwaysAllocated: true });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adapter.waitUntil(Promise.reject(new Error('bg-error')));
      spy.mockRestore();
    });

    it('diagnostics includes GCP-specific fields', () => {
      process.env.GCP_PROJECT_ID = 'my-project';
      process.env.GCP_REGION = 'us-central1';
      try {
        const adapter = new GCPCloudRunAdapter({ databaseUrl: 'pg://x', gcsBucket: 'b' });
        const diag = adapter.diagnostics;
        expect(diag.adapter).toBe('gcp-cloud-run');
        expect(diag.hasDatabaseUrl).toBe(true);
        expect(diag.hasGCSBucket).toBe(true);
        expect(diag.projectId).toBe('my-project');
        expect(diag.region).toBe('us-central1');
      } finally {
        delete process.env.GCP_PROJECT_ID;
        delete process.env.GCP_REGION;
      }
    });

    it('diagnostics falls back to CLOUD_RUN_REGION', () => {
      const savedGcp = process.env.GCP_REGION;
      delete process.env.GCP_REGION;
      process.env.CLOUD_RUN_REGION = 'europe-west1';
      try {
        const adapter = new GCPCloudRunAdapter();
        expect(adapter.diagnostics.region).toBe('europe-west1');
      } finally {
        delete process.env.CLOUD_RUN_REGION;
        if (savedGcp) process.env.GCP_REGION = savedGcp;
      }
    });
  });
});
