import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { DrizzleCruzDatabase } from '../../shared/database/drizzle-cruz-database';
import type { AnyDialectDatabase } from '../../shared/database/cruz-database';
import { assertDatabaseHas, assertDatabaseMissing, assertSoftDeleted } from '../assertions';
import { createMailFake } from '../mail-fake';
import { createQueueFake } from '../queue-fake';
import { travel, travelBack } from '../time-travel';

// ─── Test schema ──────────────────────────────────────────────────────────────

const testItems = sqliteTable('test_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  orgId: text('org_id').notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

const testSchema = { testItems };

function createInMemoryDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(`
    CREATE TABLE test_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      org_id TEXT NOT NULL,
      deleted_at INTEGER
    )
  `);
  const raw = drizzle(sqlite, { schema: testSchema });
  return DrizzleCruzDatabase.create(raw as AnyDialectDatabase);
}

// ─── assertDatabaseHas ────────────────────────────────────────────────────────

describe('assertDatabaseHas', () => {
  it('passes when a matching row exists', async () => {
    const db = createInMemoryDb();
    await db.insert(testItems).values({ id: '1', name: 'Alpha', orgId: 'org-1' });

    // Should not throw
    await assertDatabaseHas(db, testItems, { id: '1', name: 'Alpha' });
  });

  it('passes with a single column match', async () => {
    const db = createInMemoryDb();
    await db.insert(testItems).values({ id: '2', name: 'Beta', orgId: 'org-1' });

    await assertDatabaseHas(db, testItems, { orgId: 'org-1' });
  });

  it('throws when no matching row exists', async () => {
    const db = createInMemoryDb();

    await expect(
      assertDatabaseHas(db, testItems, { id: 'nonexistent' }),
    ).rejects.toThrow('Expected database to have a row in "test_items"');
  });

  it('throws with the correct where clause in the error message', async () => {
    const db = createInMemoryDb();

    await expect(
      assertDatabaseHas(db, testItems, { name: 'missing', orgId: 'org-99' }),
    ).rejects.toThrow('{"name":"missing","orgId":"org-99"}');
  });
});

// ─── assertDatabaseMissing ────────────────────────────────────────────────────

describe('assertDatabaseMissing', () => {
  it('passes when no matching row exists', async () => {
    const db = createInMemoryDb();

    await assertDatabaseMissing(db, testItems, { id: 'nonexistent' });
  });

  it('throws when a matching row is found', async () => {
    const db = createInMemoryDb();
    await db.insert(testItems).values({ id: '1', name: 'Alpha', orgId: 'org-1' });

    await expect(
      assertDatabaseMissing(db, testItems, { id: '1' }),
    ).rejects.toThrow('Expected database NOT to have a row in "test_items"');
  });

  it('passes after a row is deleted', async () => {
    const db = createInMemoryDb();
    await db.insert(testItems).values({ id: '1', name: 'Alpha', orgId: 'org-1' });

    // Verify it exists first
    await assertDatabaseHas(db, testItems, { id: '1' });

    // Delete it
    const { eq } = await import('drizzle-orm');
    await db.delete(testItems).where(eq(testItems.id, '1'));

    // Now it should be missing
    await assertDatabaseMissing(db, testItems, { id: '1' });
  });
});

// ─── assertSoftDeleted ────────────────────────────────────────────────────────

describe('assertSoftDeleted', () => {
  it('passes when the row has a non-null deletedAt', async () => {
    const db = createInMemoryDb();
    await db.insert(testItems).values({
      id: '1',
      name: 'Deleted Item',
      orgId: 'org-1',
      deletedAt: new Date(),
    });

    await assertSoftDeleted(db, testItems, '1');
  });

  it('throws when the row exists but deletedAt is null', async () => {
    const db = createInMemoryDb();
    await db.insert(testItems).values({
      id: '2',
      name: 'Active Item',
      orgId: 'org-1',
      deletedAt: null,
    });

    await expect(
      assertSoftDeleted(db, testItems, '2'),
    ).rejects.toThrow('Expected row "2" in "test_items" to be soft-deleted');
  });

  it('throws when no row with the given id exists', async () => {
    const db = createInMemoryDb();

    await expect(
      assertSoftDeleted(db, testItems, 'nonexistent'),
    ).rejects.toThrow('Expected row "nonexistent" in "test_items" to be soft-deleted');
  });
});

// ─── createMailFake ───────────────────────────────────────────────────────────

describe('createMailFake', () => {
  let mail: ReturnType<typeof createMailFake>;

  beforeEach(() => {
    mail = createMailFake();
  });

  it('records sent emails', async () => {
    await mail.sendEmail('alice@example.com', 'Welcome', '<h1>Hi</h1>');
    expect(mail.sentEmails).toHaveLength(1);
    expect(mail.sentEmails[0].to).toBe('alice@example.com');
    expect(mail.sentEmails[0].subject).toBe('Welcome');
  });

  it('assertSent passes when a matching email was sent', async () => {
    await mail.sendEmail('bob@example.com', 'Password Reset', '<p>Reset</p>');

    // Should not throw
    mail.assertSent('Password Reset');
  });

  it('assertSent throws when no matching email was sent', () => {
    expect(() => mail.assertSent('No Such Email')).toThrow(
      'Expected an email matching "No Such Email" to be sent',
    );
  });

  it('assertSentTo passes when email was sent to the address', async () => {
    await mail.sendEmail('carol@example.com', 'Invite', '<p>Join</p>');

    mail.assertSentTo('carol@example.com');
  });

  it('assertSentTo throws when no email was sent to the address', () => {
    expect(() => mail.assertSentTo('nobody@example.com')).toThrow(
      'Expected an email to be sent to "nobody@example.com"',
    );
  });

  it('assertNotSent passes when no emails were sent', () => {
    mail.assertNotSent();
  });

  it('assertNotSent throws when emails were sent', async () => {
    await mail.sendEmail('x@example.com', 'Test', '<p>test</p>');

    expect(() => mail.assertNotSent()).toThrow('Expected no emails to be sent');
  });

  it('assertCount passes with the correct count', async () => {
    await mail.sendEmail('a@example.com', 'S1', '<p>1</p>');
    await mail.sendEmail('b@example.com', 'S2', '<p>2</p>');

    mail.assertCount(2);
  });

  it('assertCount throws with the wrong count', () => {
    expect(() => mail.assertCount(1)).toThrow('Expected 1 email(s) to be sent, but 0 was sent');
  });

  it('clear removes all recorded emails', async () => {
    await mail.sendEmail('a@example.com', 'Test', '<p>test</p>');
    expect(mail.sentEmails).toHaveLength(1);

    mail.clear();
    expect(mail.sentEmails).toHaveLength(0);
  });

  it('sendBulkEmail records one entry per recipient', async () => {
    await mail.sendBulkEmail(
      ['a@example.com', 'b@example.com', 'c@example.com'],
      'Announcement',
      '<p>News</p>',
    );

    expect(mail.sentEmails).toHaveLength(3);
    mail.assertSentTo('a@example.com');
    mail.assertSentTo('b@example.com');
    mail.assertSentTo('c@example.com');
  });
});

// ─── createQueueFake ──────────────────────────────────────────────────────────

describe('createQueueFake', () => {
  let queue: ReturnType<typeof createQueueFake>;

  beforeEach(() => {
    queue = createQueueFake();
  });

  it('records dispatched jobs', () => {
    queue.record('SendWelcomeEmail', { userId: '123' });

    expect(queue.dispatched).toHaveLength(1);
    expect(queue.dispatched[0].jobClass).toBe('SendWelcomeEmail');
    expect(queue.dispatched[0].payload).toEqual({ userId: '123' });
  });

  it('assertDispatched passes when the job was dispatched', () => {
    queue.record('ProcessPayment', { amount: 100 });

    queue.assertDispatched('ProcessPayment');
  });

  it('assertDispatched throws when the job was not dispatched', () => {
    expect(() => queue.assertDispatched('MissingJob')).toThrow(
      'Expected job "MissingJob" to be dispatched',
    );
  });

  it('assertDispatched includes dispatched job names in error', () => {
    queue.record('JobA', {});
    queue.record('JobB', {});

    expect(() => queue.assertDispatched('JobC')).toThrow('JobA, JobB');
  });

  it('assertNotDispatched passes when the specific job was not dispatched', () => {
    queue.record('OtherJob', {});

    queue.assertNotDispatched('TargetJob');
  });

  it('assertNotDispatched throws when the specific job was dispatched', () => {
    queue.record('TargetJob', {});

    expect(() => queue.assertNotDispatched('TargetJob')).toThrow(
      'Expected job "TargetJob" NOT to be dispatched',
    );
  });

  it('assertNotDispatched with no argument passes when queue is empty', () => {
    queue.assertNotDispatched();
  });

  it('assertNotDispatched with no argument throws when any job was dispatched', () => {
    queue.record('SomeJob', {});

    expect(() => queue.assertNotDispatched()).toThrow(
      'Expected no jobs to be dispatched, but 1 were',
    );
  });

  it('getDispatched returns a copy of the dispatched jobs', () => {
    queue.record('Job1', { a: 1 });
    queue.record('Job2', { b: 2 });

    const result = queue.getDispatched();
    expect(result).toHaveLength(2);

    // Mutating the returned array should not affect the internal state
    result.pop();
    expect(queue.dispatched).toHaveLength(2);
  });

  it('assertCount passes with the correct count', () => {
    queue.record('Job1', {});
    queue.record('Job2', {});

    queue.assertCount(2);
  });

  it('assertCount throws with the wrong count', () => {
    expect(() => queue.assertCount(3)).toThrow(
      'Expected 3 job(s) to be dispatched, but 0 were',
    );
  });

  it('clear removes all dispatched jobs', () => {
    queue.record('Job1', {});
    queue.record('Job2', {});
    expect(queue.dispatched).toHaveLength(2);

    queue.clear();
    expect(queue.dispatched).toHaveLength(0);
  });
});

// ─── travel / travelBack ──────────────────────────────────────────────────────

describe('travel / travelBack', () => {
  afterEach(() => {
    travelBack();
  });

  it('freezes Date.now() to the specified date', () => {
    const target = new Date('2025-06-15T12:00:00Z');
    travel(target);

    expect(Date.now()).toBe(target.getTime());
  });

  it('Date.now() stays frozen across multiple calls', () => {
    const target = new Date('2025-01-01T00:00:00Z');
    travel(target);

    const first = Date.now();
    const second = Date.now();
    expect(first).toBe(second);
    expect(first).toBe(target.getTime());
  });

  it('travelBack restores the real Date.now()', () => {
    const before = Date.now();
    travel(new Date('2000-01-01T00:00:00Z'));

    expect(Date.now()).toBe(new Date('2000-01-01T00:00:00Z').getTime());

    travelBack();

    const after = Date.now();
    // After restoring, Date.now() should return a value >= the time before travel
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('travel can be called multiple times, keeping the original reference', () => {
    const first = new Date('2020-01-01T00:00:00Z');
    const second = new Date('2030-01-01T00:00:00Z');

    travel(first);
    expect(Date.now()).toBe(first.getTime());

    travel(second);
    expect(Date.now()).toBe(second.getTime());

    // One travelBack should fully restore
    travelBack();
    expect(Date.now()).not.toBe(second.getTime());
  });

  it('travelBack is a no-op if travel was never called', () => {
    const before = Date.now();
    travelBack(); // Should not throw
    const after = Date.now();
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
