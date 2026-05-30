import {
  testAdapterContract,
  testFlushPendingWork,
} from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { AWSLambdaAdapter } from '../lambda-adapter';

describe('AWSLambdaAdapter', () => {
  testAdapterContract(() => new AWSLambdaAdapter(), 'aws-lambda', 'serverless');

  testFlushPendingWork(() => new AWSLambdaAdapter());

  describe('aws-lambda-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new AWSLambdaAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new AWSLambdaAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config s3Bucket', () => {
      const adapter = new AWSLambdaAdapter({ s3Bucket: 'my-bucket' });
      expect(adapter.getStorageBucket()).toBe('my-bucket');
    });

    it('getStorageBucket falls back to process.env.S3_BUCKET', () => {
      process.env.S3_BUCKET = 'env-bucket';
      try {
        const adapter = new AWSLambdaAdapter();
        expect(adapter.getStorageBucket()).toBe('env-bucket');
      } finally {
        delete process.env.S3_BUCKET;
      }
    });

    it('diagnostics includes region', () => {
      process.env.AWS_REGION = 'us-east-1';
      try {
        const adapter = new AWSLambdaAdapter();
        expect(adapter.diagnostics.region).toBe('us-east-1');
      } finally {
        delete process.env.AWS_REGION;
      }
    });

    it('diagnostics shows unknown region when AWS_REGION is unset', () => {
      const saved = process.env.AWS_REGION;
      delete process.env.AWS_REGION;
      try {
        const adapter = new AWSLambdaAdapter();
        expect(adapter.diagnostics.region).toBe('unknown');
      } finally {
        if (saved) process.env.AWS_REGION = saved;
      }
    });

    it('waitUntil collects promises for flushPendingWork', async () => {
      const adapter = new AWSLambdaAdapter();
      let executed = false;
      adapter.waitUntil(
        new Promise<void>((resolve) => {
          executed = true;
          resolve();
        }),
      );
      expect(executed).toBe(true);
      await adapter.flushPendingWork();
    });

    it('clear resets pending work', async () => {
      const adapter = new AWSLambdaAdapter();
      adapter.waitUntil(Promise.resolve());
      adapter.clear();
      // After clear, flushPendingWork should have nothing to do
      await expect(adapter.flushPendingWork()).resolves.toBeUndefined();
    });
  });
});
