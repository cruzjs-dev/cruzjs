/**
 * Database Factory Unit Tests
 *
 * Tests for defineFactory: build, buildMany, create, createMany, state overrides,
 * and database insertion via createTestDb patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineFactory } from '../factories/factory';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { DrizzleCruzDatabase } from '../../shared/database/drizzle-cruz-database';
import type { AnyDialectDatabase } from '../../shared/database/cruz-database';
import { eq } from 'drizzle-orm';

// ─── Test Schema ──────────────────────────────────────────────────────────────

const testUsers = sqliteTable('test_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  score: integer('score').notNull().default(0),
});

const testSchema = { testUsers };

function createInMemoryDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(`
    CREATE TABLE test_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      score INTEGER NOT NULL DEFAULT 0
    )
  `);
  const raw = drizzle(sqlite, { schema: testSchema });
  return DrizzleCruzDatabase.create(raw as AnyDialectDatabase);
}

// ─── Factory Definitions ──────────────────────────────────────────────────────

let counter = 0;

const UserFactory = defineFactory(() => {
  counter++;
  return {
    id: `user-${counter}`,
    name: `User ${counter}`,
    email: `user${counter}@example.com`,
    role: 'member',
    score: 0,
  };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('defineFactory', () => {
  beforeEach(() => {
    counter = 0;
  });

  describe('build', () => {
    it('returns an object with default values', () => {
      const user = UserFactory.build();

      expect(user.id).toBe('user-1');
      expect(user.name).toBe('User 1');
      expect(user.email).toBe('user1@example.com');
      expect(user.role).toBe('member');
      expect(user.score).toBe(0);
    });

    it('generates fresh values on each call', () => {
      const user1 = UserFactory.build();
      const user2 = UserFactory.build();

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).not.toBe(user2.email);
    });

    it('applies overrides to the built object', () => {
      const user = UserFactory.build({
        name: 'Custom Name',
        role: 'admin',
        score: 100,
      });

      expect(user.name).toBe('Custom Name');
      expect(user.role).toBe('admin');
      expect(user.score).toBe(100);
      // Non-overridden fields still use defaults
      expect(user.email).toContain('@example.com');
    });

    it('overrides take precedence over defaults', () => {
      const user = UserFactory.build({ id: 'custom-id' });
      expect(user.id).toBe('custom-id');
    });
  });

  describe('buildMany', () => {
    it('returns the specified number of items', () => {
      const users = UserFactory.buildMany(3);

      expect(users).toHaveLength(3);
    });

    it('each item has unique values', () => {
      const users = UserFactory.buildMany(3);

      const ids = users.map((u) => u.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('applies overrides to all items', () => {
      const users = UserFactory.buildMany(2, { role: 'admin' });

      expect(users[0].role).toBe('admin');
      expect(users[1].role).toBe('admin');
      // But IDs should still be unique
      expect(users[0].id).not.toBe(users[1].id);
    });
  });

  describe('state', () => {
    it('defines and applies a named state', () => {
      const factory = defineFactory(() => ({
        id: `u-${++counter}`,
        name: 'Default',
        email: 'default@test.com',
        role: 'member',
        score: 0,
      }));

      // Register state
      factory.state('admin', { role: 'admin', score: 999 });

      // Use state
      const admin = factory.state('admin').build();
      expect(admin.role).toBe('admin');
      expect(admin.score).toBe(999);
    });

    it('throws for unknown state', () => {
      const factory = defineFactory(() => ({
        id: '1',
        name: 'Test',
      }));

      expect(() => factory.state('nonexistent')).toThrow(
        'Unknown factory state: "nonexistent"',
      );
    });

    it('state is chainable for registration', () => {
      const factory = defineFactory(() => ({
        id: `u-${++counter}`,
        role: 'member',
        level: 1,
      }));

      // Chain multiple state registrations
      const result = factory
        .state('admin', { role: 'admin', level: 10 })
        .state('superadmin', { role: 'superadmin', level: 99 });

      // The returned value is the same factory
      expect(result).toBe(factory);

      // Both states work
      expect(factory.state('admin').build().role).toBe('admin');
      expect(factory.state('superadmin').build().role).toBe('superadmin');
    });

    it('state accepts a function for dynamic overrides', () => {
      let stateCounter = 0;

      const factory = defineFactory(() => ({
        id: `u-${++counter}`,
        label: 'default',
      }));

      factory.state('numbered', () => ({
        label: `label-${++stateCounter}`,
      }));

      const item1 = factory.state('numbered').build();
      const item2 = factory.state('numbered').build();

      expect(item1.label).toBe('label-1');
      expect(item2.label).toBe('label-2');
    });
  });

  describe('create (database)', () => {
    it('inserts a record into the database', async () => {
      const db = createInMemoryDb();

      const factory = defineFactory(() => ({
        id: `user-${++counter}`,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        score: 0,
      }));

      const user = await factory.create(db, testUsers);

      expect(user.id).toContain('user-');
      expect(user.name).toBe('Test User');

      // Verify it's actually in the database
      const [row] = await db
        .select()
        .from(testUsers)
        .where(eq(testUsers.id, user.id))
        .limit(1);

      expect(row).toBeDefined();
      expect(row.name).toBe('Test User');
    });

    it('applies overrides when creating in database', async () => {
      const db = createInMemoryDb();

      const factory = defineFactory(() => ({
        id: `user-${++counter}`,
        name: 'Default Name',
        email: 'default@example.com',
        role: 'member',
        score: 0,
      }));

      const user = await factory.create(db, testUsers, {
        name: 'Override Name',
        role: 'admin',
      });

      expect(user.name).toBe('Override Name');
      expect(user.role).toBe('admin');
    });
  });

  describe('createMany (database)', () => {
    it('inserts multiple records into the database', async () => {
      const db = createInMemoryDb();

      const factory = defineFactory(() => ({
        id: `user-${++counter}`,
        name: `User ${counter}`,
        email: `user${counter}@example.com`,
        role: 'member',
        score: 0,
      }));

      const users = await factory.createMany(db, testUsers, 3);

      expect(users).toHaveLength(3);

      // Verify all are in the database
      const allRows = await db.select().from(testUsers);
      expect(allRows).toHaveLength(3);
    });

    it('applies overrides to all created records', async () => {
      const db = createInMemoryDb();

      const factory = defineFactory(() => ({
        id: `user-${++counter}`,
        name: `User ${counter}`,
        email: `user${counter}@example.com`,
        role: 'member',
        score: 0,
      }));

      const users = await factory.createMany(db, testUsers, 2, { role: 'admin' });

      expect(users[0].role).toBe('admin');
      expect(users[1].role).toBe('admin');
    });
  });
});
