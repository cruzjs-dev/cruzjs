import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  detectFeaturesDir,
  detectSrcDir,
  type FeatureScope,
  type FieldDef,
} from './new-feature';

// ── Name Helpers ──────────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function pluralizePascal(str: string): string {
  if (str.endsWith('s') || str.endsWith('S')) return str;
  return str + 's';
}

function pluralizeCamel(str: string): string {
  if (str.endsWith('s') || str.endsWith('S')) return str;
  return str + 's';
}

// ── Field Type Mapping ────────────────────────────────────────────────────────

function drizzleType(field: FieldDef): string {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'uuid':
      return `text('${field.name}')`;
    case 'number':
    case 'int':
    case 'integer':
      return `integer('${field.name}')`;
    case 'float':
    case 'real':
      return `real('${field.name}')`;
    case 'boolean':
    case 'bool':
      return `integer('${field.name}', { mode: 'boolean' })`;
    case 'date':
    case 'datetime':
    case 'timestamp':
      return `integer('${field.name}', { mode: 'timestamp_ms' })`;
    case 'json':
      return `text('${field.name}', { mode: 'json' })`;
    default:
      return `text('${field.name}')`;
  }
}

function needsRealImport(fields?: FieldDef[]): boolean {
  if (!fields || fields.length === 0) return false;
  return fields.some(f => f.type === 'float' || f.type === 'real');
}

// ── Schema Template ──────────────────────────────────────────────────────────

function schemaTemplate(
  kebab: string,
  pascal: string,
  camel: string,
  scope: FeatureScope,
  fields?: FieldDef[],
): string {
  const hasFields = fields && fields.length > 0;
  const hasReal = needsRealImport(fields);

  const drizzleParts = ['sqliteTable', 'text', 'integer'];
  if (hasReal) drizzleParts.push('real');
  if (scope !== 'global') drizzleParts.push('index');
  const drizzleImports = `import { ${drizzleParts.join(', ')} } from 'drizzle-orm/sqlite-core';`;

  const imports: string[] = [
    drizzleImports,
    `import { createId } from '@paralleldrive/cuid2';`,
  ];

  if (scope === 'org') {
    imports.push(`import { fkRef } from '@cruzjs/drizzle-universal';`);
    imports.push(`import { authIdentity, organizations } from '@cruzjs/core/database/schema';`);
  } else if (scope === 'user') {
    imports.push(`import { fkRef } from '@cruzjs/drizzle-universal';`);
    imports.push(`import { authIdentity } from '@cruzjs/core/database/schema';`);
  }

  const columns: string[] = [
    `  id: text('id').primaryKey().$defaultFn(() => createId()),`,
  ];

  if (scope === 'org') {
    columns.push(
      `  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),`,
    );
    columns.push(
      `  createdById: text('createdById')\n    .notNull()\n    .references(() => fkRef(authIdentity.id), { onDelete: 'cascade' }),`,
    );
  } else if (scope === 'user') {
    columns.push(
      `  userId: text('userId')\n    .notNull()\n    .references(() => fkRef(authIdentity.id), { onDelete: 'cascade' }),`,
    );
  }

  if (hasFields) {
    for (const field of fields) {
      columns.push(`  ${field.name}: ${drizzleType(field)},`);
    }
  } else {
    columns.push(`  name: text('name').notNull(),`);
    columns.push(`  description: text('description'),`);
  }

  columns.push(`  createdAt: integer('createdAt', { mode: 'timestamp_ms' })\n    .notNull()\n    .$defaultFn(() => new Date()),`);
  columns.push(`  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })\n    .notNull()\n    .$defaultFn(() => new Date()),`);

  const tableName = pluralizePascal(pascal);
  const tableVar = pluralizeCamel(camel);

  const indices: string[] = [];
  if (scope === 'org') {
    indices.push(`  orgIdIdx: index('${tableName}_orgId_idx').on(table.orgId),`);
    indices.push(`  createdByIdIdx: index('${tableName}_createdById_idx').on(table.createdById),`);
  } else if (scope === 'user') {
    indices.push(`  userIdIdx: index('${tableName}_userId_idx').on(table.userId),`);
  }

  const indexBlock = indices.length > 0
    ? `, (table) => ({\n${indices.join('\n')}\n})`
    : '';

  return `${imports.join('\n')}

export const ${tableVar} = sqliteTable('${tableName}', {
${columns.join('\n')}
}${indexBlock});

// Type exports
export type ${pascal} = typeof ${tableVar}.$inferSelect;
export type New${pascal} = typeof ${tableVar}.$inferInsert;
`;
}

// ── Wire schema export ──────────────────────────────────────────────────────

function wireSchemaExport(
  rootDir: string,
  srcDir: string,
  kebab: string,
): boolean {
  const schemaFile = resolve(rootDir, srcDir, 'database', 'schema.ts');
  if (!existsSync(schemaFile)) return false;

  try {
    let src = readFileSync(schemaFile, 'utf-8');
    const exportLine = `export * from '../features/${kebab}/${kebab}.schema';\n`;

    if (!src.includes(`features/${kebab}`)) {
      src = src.trimEnd() + '\n' + exportLine;
      writeFileSync(schemaFile, src, 'utf-8');
      return true;
    }
  } catch {
    // Non-fatal
  }

  return false;
}

// ── Component ─────────────────────────────────────────────────────────────────

type NewModelProps = {
  rootDir: string;
  name: string;
  scope: FeatureScope;
  wire: boolean;
  fields?: FieldDef[];
};

export const NewModel: React.FC<NewModelProps> = ({ rootDir, name, scope, wire, fields }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFile, setCreatedFile] = useState<string | null>(null);
  const [wiredSchema, setWiredSchema] = useState(false);

  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const featuresDir = detectFeaturesDir(rootDir);
  const srcDir = detectSrcDir(rootDir);

  useEffect(() => {
    const run = () => {
      const targetDir = resolve(rootDir, featuresDir, kebab);
      const schemaPath = resolve(targetDir, `${kebab}.schema.ts`);

      if (existsSync(schemaPath)) {
        setError(`Schema file already exists: ${featuresDir}/${kebab}/${kebab}.schema.ts`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      // Create directory if it doesn't exist
      mkdirSync(targetDir, { recursive: true });

      // Generate and write only the schema file
      const content = schemaTemplate(kebab, pascal, camel, scope, fields);
      writeFileSync(schemaPath, content, 'utf-8');
      setCreatedFile(`${featuresDir}/${kebab}/${kebab}.schema.ts`);

      // Auto-wire schema export
      if (wire) {
        const wired = wireSchemaExport(rootDir, srcDir, kebab);
        setWiredSchema(wired);
      }

      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, scope, wire, fields, kebab, pascal, camel, featuresDir, srcDir, exit]);

  const schemaFile = `${srcDir}/database/schema.ts`;
  const fieldSummary = fields && fields.length > 0
    ? fields.map(f => `${f.name}:${f.type}`).join(', ')
    : 'name, description';

  return (
    <Box flexDirection="column">
      <Header title="New Model" subtitle={`${kebab} (${scope}-scoped)`} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created schema: {createdFile}</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            <Text color="gray">Fields: {fieldSummary}</Text>
            {wiredSchema && <Text color="cyan">~ {schemaFile} (schema exported)</Text>}
          </Box>
          <Box flexDirection="column" marginTop={1}>
            {wire ? (
              <>
                <Info>Auto-wired! Run migrations to finish:</Info>
                <Text color="gray">  cruz db generate && cruz db migrate</Text>
              </>
            ) : (
              <>
                <Info>Next steps:</Info>
                <Text color="gray">  1. Export schema in {schemaFile}:</Text>
                <Text color="gray">     export * from '../features/{kebab}/{kebab}.schema';</Text>
                <Text> </Text>
                <Text color="gray">  2. Generate + apply migration:</Text>
                <Text color="gray">     cruz db generate && cruz db migrate</Text>
              </>
            )}
          </Box>
        </Box>
      ) : (
        <Text>Scaffolding model...</Text>
      )}
    </Box>
  );
};

export default NewModel;
