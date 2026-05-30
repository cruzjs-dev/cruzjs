import { testAdapterContract } from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { DockerAdapter } from '../docker-adapter';

describe('DockerAdapter', () => {
  testAdapterContract(() => new DockerAdapter(), 'docker', 'container');

  describe('docker-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new DockerAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new DockerAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config s3Bucket', () => {
      const adapter = new DockerAdapter({ s3Bucket: 'my-bucket' });
      expect(adapter.getStorageBucket()).toBe('my-bucket');
    });

    it('getStorageBucket falls back to process.env.S3_BUCKET', () => {
      process.env.S3_BUCKET = 'env-bucket';
      try {
        const adapter = new DockerAdapter();
        expect(adapter.getStorageBucket()).toBe('env-bucket');
      } finally {
        delete process.env.S3_BUCKET;
      }
    });

    it('getAI supports custom base URL for Ollama/vLLM', () => {
      const adapter = new DockerAdapter({
        openaiApiKey: 'test-key',
        openaiBaseUrl: 'http://localhost:11434/v1',
      });
      const ai = adapter.getAI();
      expect(ai).not.toBeNull();
    });

    it('waitUntil fires and forgets (catches errors silently)', () => {
      const adapter = new DockerAdapter();
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adapter.waitUntil(Promise.reject(new Error('bg-error')));
      spy.mockRestore();
    });

    it('diagnostics includes docker-specific fields', () => {
      const adapter = new DockerAdapter({
        databaseUrl: 'pg://x',
        s3Bucket: 'b',
        storagePath: '/data/storage',
      });
      const diag = adapter.diagnostics;
      expect(diag.adapter).toBe('docker');
      expect(diag.hasDatabaseUrl).toBe(true);
      expect(diag.hasS3Bucket).toBe(true);
      expect(diag.hasStoragePath).toBe(true);
    });

    it('diagnostics hasStoragePath reads from process.env.STORAGE_PATH', () => {
      process.env.STORAGE_PATH = '/mnt/storage';
      try {
        const adapter = new DockerAdapter();
        expect(adapter.diagnostics.hasStoragePath).toBe(true);
      } finally {
        delete process.env.STORAGE_PATH;
      }
    });
  });
});
