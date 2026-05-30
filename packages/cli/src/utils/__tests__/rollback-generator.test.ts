import { describe, it, expect } from 'vitest';
import { generateRollback } from '../rollback-generator';

describe('generateRollback', () => {
  it('reverses CREATE TABLE to DROP TABLE', () => {
    const sql = 'CREATE TABLE `foo` (`id` TEXT PRIMARY KEY);';
    const { sql: result, reversedCount, todoCount } = generateRollback(sql, 'test-migration');
    expect(result).toContain('DROP TABLE IF EXISTS `foo`');
    expect(reversedCount).toBe(1);
    expect(todoCount).toBe(0);
  });

  it('reverses ALTER TABLE ADD COLUMN to DROP COLUMN', () => {
    const sql = 'ALTER TABLE `users` ADD COLUMN `deletedAt` TEXT;';
    const { sql: result } = generateRollback(sql, 'add-deleted-at');
    expect(result).toContain('ALTER TABLE `users` DROP COLUMN `deletedAt`');
  });

  it('inserts TODO for irreversible statements', () => {
    const sql = 'UPDATE users SET name = lower(name);';
    const { sql: result, todoCount } = generateRollback(sql, 'data-migration');
    expect(result).toContain('TODO');
    expect(todoCount).toBe(1);
  });

  it('reverses CREATE INDEX to DROP INDEX', () => {
    const sql = 'CREATE INDEX `idx_users_email` ON `users` (`email`);';
    const { sql: result, reversedCount } = generateRollback(sql, 'add-index');
    expect(result).toContain('DROP INDEX IF EXISTS `idx_users_email`');
    expect(reversedCount).toBe(1);
  });

  it('includes header comment with migration name', () => {
    const { sql } = generateRollback('SELECT 1;', 'my-migration');
    expect(sql).toContain('my-migration');
    expect(sql).toContain('WARNING');
  });
});
