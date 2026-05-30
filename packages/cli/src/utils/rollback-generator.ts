export interface RollbackResult {
  sql: string;
  reversedCount: number;
  todoCount: number;
}

function todo(original: string): string {
  return `-- TODO: manually implement rollback for:\n-- ${original.replace(/\n/g, '\n-- ')}`;
}

export function generateRollback(forwardSql: string, migrationName: string): RollbackResult {
  const statements = forwardSql
    .split(/;?\s*-->\s*statement-breakpoint\s*|;(?=\s*\n|\s*$)/gm)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));

  const reversed: string[] = [];
  let reversedCount = 0;
  let todoCount = 0;

  const header = [
    `-- Rollback skeleton for: ${migrationName}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- WARNING: Review all statements before running. Data-modifying statements require manual implementation.`,
    '',
  ].join('\n');

  for (const stmt of statements.reverse()) {
    const upper = stmt.toUpperCase().trimStart();

    if (upper.startsWith('CREATE TABLE')) {
      const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
      if (match) {
        reversed.push(`DROP TABLE IF EXISTS \`${match[1]}\`;`);
        reversedCount++;
        continue;
      }
    }

    if (upper.startsWith('CREATE INDEX') || upper.startsWith('CREATE UNIQUE INDEX')) {
      const match = stmt.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
      if (match) {
        reversed.push(`DROP INDEX IF EXISTS \`${match[1]}\`;`);
        reversedCount++;
        continue;
      }
    }

    if (upper.startsWith('ALTER TABLE') && upper.includes('ADD COLUMN')) {
      const match = stmt.match(/ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+ADD\s+COLUMN\s+[`"]?(\w+)[`"]?/i);
      if (match) {
        reversed.push(`ALTER TABLE \`${match[1]}\` DROP COLUMN \`${match[2]}\`;`);
        reversedCount++;
        continue;
      }
    }

    if (upper.startsWith('ALTER TABLE') && upper.includes('RENAME TO')) {
      const match = stmt.match(/ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+RENAME\s+TO\s+[`"]?(\w+)[`"]?/i);
      if (match) {
        reversed.push(`ALTER TABLE \`${match[2]}\` RENAME TO \`${match[1]}\`;`);
        reversedCount++;
        continue;
      }
    }

    reversed.push(todo(stmt));
    todoCount++;
  }

  const sql = [header, ...reversed].join('\n\n');
  return { sql, reversedCount, todoCount };
}
