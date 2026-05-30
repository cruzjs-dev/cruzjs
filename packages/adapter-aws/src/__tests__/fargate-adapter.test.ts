import { testAdapterContract } from '@cruzjs/core/runtime/__tests__/adapter-contract.test-utils';
import { AWSFargateAdapter } from '../fargate-adapter';

describe('AWSFargateAdapter', () => {
  testAdapterContract(() => new AWSFargateAdapter(), 'aws-fargate', 'container');

  describe('aws-fargate-specific behavior', () => {
    it('getDatabase returns config databaseUrl when provided', () => {
      const adapter = new AWSFargateAdapter({ databaseUrl: 'postgres://host/db' });
      expect(adapter.getDatabase()).toBe('postgres://host/db');
    });

    it('getDatabase falls back to process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://env/db';
      try {
        const adapter = new AWSFargateAdapter();
        expect(adapter.getDatabase()).toBe('postgres://env/db');
      } finally {
        delete process.env.DATABASE_URL;
      }
    });

    it('getStorageBucket returns config s3Bucket', () => {
      const adapter = new AWSFargateAdapter({ s3Bucket: 'my-bucket' });
      expect(adapter.getStorageBucket()).toBe('my-bucket');
    });

    it('getStorageBucket falls back to process.env.S3_BUCKET', () => {
      process.env.S3_BUCKET = 'env-bucket';
      try {
        const adapter = new AWSFargateAdapter();
        expect(adapter.getStorageBucket()).toBe('env-bucket');
      } finally {
        delete process.env.S3_BUCKET;
      }
    });

    it('waitUntil fires and forgets (catches errors silently)', () => {
      const adapter = new AWSFargateAdapter();
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adapter.waitUntil(Promise.reject(new Error('bg-error')));
      spy.mockRestore();
      // No throw = success
    });

    it('diagnostics includes AWS-specific fields', () => {
      process.env.AWS_REGION = 'eu-west-1';
      try {
        const adapter = new AWSFargateAdapter({ databaseUrl: 'pg://x', s3Bucket: 'b' });
        const diag = adapter.diagnostics;
        expect(diag.adapter).toBe('aws-fargate');
        expect(diag.hasDatabaseUrl).toBe(true);
        expect(diag.hasS3Bucket).toBe(true);
        expect(diag.region).toBe('eu-west-1');
      } finally {
        delete process.env.AWS_REGION;
      }
    });
  });
});
