import { describe, it, expect, beforeEach } from 'vitest';
import { sqliteBuilder } from '../builders/sqlite';
import { pgBuilder } from '../builders/pg';
import { mysqlBuilder } from '../builders/mysql';
import {
  setDialectBuilder,
  getDialectBuilder,
  resetDialectBuilder,
} from '../registry';
import type { DialectBuilder } from '../types';

// ---------------------------------------------------------------------------
// Builder identity
// ---------------------------------------------------------------------------

describe('sqliteBuilder', () => {
  it('has dialect = sqlite', () => {
    expect(sqliteBuilder.dialect).toBe('sqlite');
  });

  it('satisfies DialectBuilder interface', () => {
    const b: DialectBuilder = sqliteBuilder;
    expect(b).toBeDefined();
  });

  it('table() produces a drizzle table', () => {
    const t = sqliteBuilder.table('TestTable', {
      id: sqliteBuilder.text('id').primaryKey(),
    });
    expect(t).toBeDefined();
    expect((t as any)[Symbol.for('drizzle:Name')]).toBe('TestTable');
  });

  it('boolean() uses integer mode', () => {
    const col = sqliteBuilder.boolean('active');
    expect((col as any).config?.columnType).toBe('SQLiteBoolean');
  });

  it('timestamp() produces a text column (ISO strings)', () => {
    const col = sqliteBuilder.timestamp('createdAt');
    expect((col as any).config?.columnType).toBe('SQLiteText');
  });

  it('json() produces a json text column', () => {
    const col = sqliteBuilder.json('metadata');
    expect((col as any).config?.columnType).toBe('SQLiteTextJson');
  });
});

describe('pgBuilder', () => {
  it('has dialect = postgresql', () => {
    expect(pgBuilder.dialect).toBe('postgresql');
  });

  it('satisfies DialectBuilder interface', () => {
    const b: DialectBuilder = pgBuilder;
    expect(b).toBeDefined();
  });

  it('table() produces a drizzle table', () => {
    const t = pgBuilder.table('TestTable', {
      id: pgBuilder.text('id').primaryKey(),
    });
    expect(t).toBeDefined();
    expect((t as any)[Symbol.for('drizzle:Name')]).toBe('TestTable');
  });

  it('boolean() produces a native PG boolean column', () => {
    const col = pgBuilder.boolean('active');
    expect((col as any).config?.columnType).toBe('PgBoolean');
  });

  it('timestamp() uses string mode with timezone', () => {
    const col = pgBuilder.timestamp('createdAt');
    // PG string-mode timestamp has columnType PgTimestampString + withTimezone
    expect((col as any).config?.columnType).toBe('PgTimestampString');
    expect((col as any).config?.withTimezone).toBe(true);
  });

  it('json() produces a jsonb column', () => {
    const col = pgBuilder.json('metadata');
    expect((col as any).config?.columnType).toBe('PgJsonb');
  });
});

describe('mysqlBuilder', () => {
  it('has dialect = mysql', () => {
    expect(mysqlBuilder.dialect).toBe('mysql');
  });

  it('satisfies DialectBuilder interface', () => {
    const b: DialectBuilder = mysqlBuilder;
    expect(b).toBeDefined();
  });

  it('table() produces a drizzle table', () => {
    const t = mysqlBuilder.table('TestTable', {
      id: mysqlBuilder.text('id').primaryKey(),
    });
    expect(t).toBeDefined();
    expect((t as any)[Symbol.for('drizzle:Name')]).toBe('TestTable');
  });

  it('boolean() uses tinyint column', () => {
    const col = mysqlBuilder.boolean('active');
    expect((col as any).config?.columnType).toBe('MySqlTinyInt');
  });

  it('timestamp() uses string mode', () => {
    const col = mysqlBuilder.timestamp('createdAt');
    // MySQL stores columnType in col.config (not col.columnType directly)
    expect((col as any).config?.columnType).toBe('MySqlTimestampString');
  });

  it('json() produces a json column', () => {
    const col = mysqlBuilder.json('metadata');
    expect((col as any).config?.columnType).toBe('MySqlJson');
  });
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe('dialect registry', () => {
  beforeEach(() => {
    resetDialectBuilder();
  });

  it('defaults to sqlite when nothing is set', () => {
    const b = getDialectBuilder();
    expect(b.dialect).toBe('sqlite');
  });

  it('returns the builder that was set', () => {
    setDialectBuilder(pgBuilder);
    expect(getDialectBuilder().dialect).toBe('postgresql');
  });

  it('can be reset back to sqlite default', () => {
    setDialectBuilder(pgBuilder);
    resetDialectBuilder();
    expect(getDialectBuilder().dialect).toBe('sqlite');
  });

  it('switching builders changes the active dialect', () => {
    setDialectBuilder(sqliteBuilder);
    expect(getDialectBuilder().dialect).toBe('sqlite');

    setDialectBuilder(pgBuilder);
    expect(getDialectBuilder().dialect).toBe('postgresql');

    setDialectBuilder(mysqlBuilder);
    expect(getDialectBuilder().dialect).toBe('mysql');
  });
});

// ---------------------------------------------------------------------------
// Schema factory shape consistency across dialects
// ---------------------------------------------------------------------------

describe('schema factory shape consistency', () => {
  const builders: [string, DialectBuilder][] = [
    ['sqlite', sqliteBuilder],
    ['postgresql', pgBuilder],
    ['mysql', mysqlBuilder],
  ];

  function createTestSchema(b: DialectBuilder) {
    return {
      users: b.table('User', {
        id: b.text('id').primaryKey(),
        name: b.text('name').notNull(),
        isActive: b.boolean('isActive').default(false),
        score: b.real('score'),
        metadata: b.json<{ role: string }>('metadata'),
        createdAt: b.timestamp('createdAt').notNull(),
      }),
    };
  }

  builders.forEach(([dialectName, b]) => {
    it(`${dialectName}: schema has correct table and column names`, () => {
      const schema = createTestSchema(b);
      expect(schema.users).toBeDefined();

      const colNames = Object.keys(schema.users);
      // Drizzle tables expose columns as top-level keys
      expect(colNames).toContain('id');
      expect(colNames).toContain('name');
      expect(colNames).toContain('isActive');
      expect(colNames).toContain('score');
      expect(colNames).toContain('metadata');
      expect(colNames).toContain('createdAt');
    });
  });
});
