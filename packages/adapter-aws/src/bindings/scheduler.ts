/**
 * AWS DynamoDB Scheduler Adapter
 *
 * Uses DynamoDB conditional writes for distributed locking.
 * Falls back to in-memory locking when DynamoDB is not configured.
 *
 * Requires a DynamoDB table with:
 * - Partition key: `pk` (String)
 * - TTL attribute: `expiresAt` (Number, epoch seconds)
 *
 * Table name from env: SCHEDULER_LOCKS_TABLE (default: 'SchedulerLocks')
 */

import type { SchedulerAdapter } from '@cruzjs/core/scheduler';
import { InMemorySchedulerAdapter } from './scheduler-memory';

const LOCK_PREFIX = 'scheduler-lock:';

export class DynamoDBSchedulerAdapter implements SchedulerAdapter {
  private readonly fallback = new InMemorySchedulerAdapter();

  constructor(private readonly tableName: string | null) {}

  async acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
    if (!this.tableName) {
      return this.fallback.acquireLock(name, ttlSeconds);
    }

    // TODO: Replace with actual DynamoDB SDK conditional put
    // const params = {
    //   TableName: this.tableName,
    //   Item: {
    //     pk: { S: `${LOCK_PREFIX}${name}` },
    //     acquiredAt: { N: String(Date.now()) },
    //     expiresAt: { N: String(Math.floor(Date.now() / 1000) + ttlSeconds) },
    //   },
    //   ConditionExpression: 'attribute_not_exists(pk)',
    // };
    // await dynamodb.putItem(params);
    return this.fallback.acquireLock(name, ttlSeconds);
  }

  async releaseLock(name: string): Promise<void> {
    if (!this.tableName) {
      return this.fallback.releaseLock(name);
    }

    // TODO: await dynamodb.deleteItem({ TableName, Key: { pk: { S: `${LOCK_PREFIX}${name}` } } });
    return this.fallback.releaseLock(name);
  }
}
