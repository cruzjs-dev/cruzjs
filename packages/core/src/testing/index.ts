/**
 * @cruzjs/core/testing
 *
 * Test utilities for CruzJS applications.
 * Provides container, database, context, event, procedure, assertion,
 * fake, and time-travel helpers for writing isolated, fast tests.
 */

// Test Container
export { createTestContainer } from './test-container';
export type { TestContainerOptions } from './test-container';

// Test Database
export { createTestDb, createTestDbWithMigrations } from './test-db';
export type { TestDbOptions } from './test-db';

// Test Context
export { createTestContext } from './test-context';
export type { TestContextOverrides } from './test-context';

// Mock Event Emitter
export { MockEventEmitter } from './mock-event-emitter';

// Procedure Calling
export { createRouterCaller, callProcedure } from './call-procedure';

// Test Transactions
export { withTestTransaction, useTestTransaction } from './test-transaction';

// Database Assertions
export { assertDatabaseHas, assertDatabaseMissing, assertSoftDeleted } from './assertions';

// Fakes
export { createMailFake } from './mail-fake';
export type { MailFake, SentEmail } from './mail-fake';
export { createStorageFake } from './storage-fake';
export type { StorageFake } from './storage-fake';
export { createQueueFake } from './queue-fake';
export type { QueueFake, DispatchedJob } from './queue-fake';

// Time Travel
export { travel, travelBack } from './time-travel';

// HTTP Testing
export { createTestApp } from './test-app';
