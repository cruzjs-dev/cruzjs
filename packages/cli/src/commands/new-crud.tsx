import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { detectFeaturesDir, detectSrcDir, wireModule, type FeatureScope } from './new-feature';

type NewCrudProps = {
  rootDir: string;
  name: string;
  scope: FeatureScope;
  wire: boolean;
};

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

// ── Templates ─────────────────────────────────────────────────────────────────

function schemaTemplate(pascal: string, kebab: string, camel: string, scope: FeatureScope): string {
  const scopeCol = scope === 'org'
    ? `  orgId: text('orgId').notNull().references(() => fkRef(organizations.id), { onDelete: 'cascade' }),`
    : scope === 'user'
    ? `  userId: text('userId').notNull().references(() => fkRef(authIdentity.id), { onDelete: 'cascade' }),`
    : '';

  const scopeIdx = scope === 'org'
    ? `  orgIdIdx: index('${pascal}_orgId_idx').on(table.orgId),`
    : scope === 'user'
    ? `  userIdIdx: index('${pascal}_userId_idx').on(table.userId),`
    : '';

  const coreImports = scope === 'org'
    ? `import { organizations } from '@cruzjs/core/database/schema';`
    : scope === 'user'
    ? `import { authIdentity } from '@cruzjs/core/database/schema';`
    : '';

  return `import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { fkRef } from '@cruzjs/drizzle-universal';
${coreImports}

export const ${camel} = sqliteTable('${pascal}', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
${scopeCol ? scopeCol + '\n' : ''}  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
${scopeIdx}
}));

export type ${pascal} = typeof ${camel}.$inferSelect;
export type New${pascal} = typeof ${camel}.$inferInsert;
`;
}

function crudModuleTemplate(pascal: string, kebab: string, camel: string, scope: FeatureScope): string {
  const scopeValue = `'${scope}'`;
  const scopeColComment = scope === 'org'
    ? `  // scope: 'org' → filters by orgId, requires X-Organization-Id header`
    : scope === 'user'
    ? `  // scope: 'user' → filters by userId, requires auth session`
    : `  // scope: 'global' → no scope filter (admin/platform data)`;

  return `import { Module } from '@cruzjs/core/di';
import { createCrud } from '@cruzjs/core/crud';
import { z } from 'zod';
import { ${camel} } from './${kebab}.schema';

export const {
  Service: ${pascal}Service,
  Trpc: ${pascal}Trpc,
  RestRouter: ${pascal}RestRouter,
} = createCrud({
  name: '${pascal}',
  table: ${camel},
${scopeColComment}
  scope: ${scopeValue},
  createSchema: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
  }),
  updateSchema: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
  ordering: ['name', 'createdAt'],
});

@Module({
  providers: [${pascal}Service, ${pascal}Trpc, ${pascal}RestRouter],
  trpcRouters: {
    ${camel}: ${pascal}Trpc,
  },
  apiRouters: [${pascal}RestRouter],
})
export class ${pascal}Module {}
`;
}

function indexTemplate(pascal: string, kebab: string, camel: string): string {
  return `export { ${pascal}Module } from './${kebab}.crud';
export { ${camel} } from './${kebab}.schema';
export type { ${pascal} } from './${kebab}.schema';
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewCrud: React.FC<NewCrudProps> = ({ rootDir, name, scope, wire }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [wiredServer, setWiredServer] = useState(false);
  const [wiredSchema, setWiredSchema] = useState(false);

  useEffect(() => {
    const run = () => {
      const pascal = toPascalCase(name);
      const kebab = toKebabCase(name);
      const camel = toCamelCase(name);

      const featuresDir = detectFeaturesDir(rootDir);
      const srcDir = detectSrcDir(rootDir);
      const targetDir = resolve(rootDir, featuresDir, kebab);

      if (existsSync(targetDir)) {
        setError(`Directory already exists: ${featuresDir}/${kebab}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      mkdirSync(targetDir, { recursive: true });

      const files: Record<string, string> = {
        [`${kebab}.schema.ts`]: schemaTemplate(pascal, kebab, camel, scope),
        [`${kebab}.crud.ts`]: crudModuleTemplate(pascal, kebab, camel, scope),
        [`index.ts`]: indexTemplate(pascal, kebab, camel),
      };

      const written: string[] = [];
      for (const [fileName, content] of Object.entries(files)) {
        writeFileSync(resolve(targetDir, fileName), content, 'utf-8');
        written.push(`${featuresDir}/${kebab}/${fileName}`);
      }

      setCreatedFiles(written);

      if (wire) {
        const { serverWired, schemaWired } = wireModule(rootDir, srcDir, kebab, pascal);
        setWiredServer(serverWired);
        setWiredSchema(schemaWired);
      }

      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, scope, wire, exit]);

  const pascal = toPascalCase(name);
  const kebab = toKebabCase(name);
  const camel = toCamelCase(name);

  return (
    <Box flexDirection="column">
      <Header title="New CRUD Module" subtitle={`${pascal} (${scope}-scoped)`} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created CRUD module: {pascal}</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            {createdFiles.map((f) => (
              <Text key={f} color="gray">+ {f}</Text>
            ))}
            {wiredServer && <Text color="cyan">~ server.cloudflare.ts (module registered)</Text>}
            {wiredSchema && <Text color="cyan">~ database/schema.ts (schema exported)</Text>}
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
                <Text color="gray">  1. Export schema in src/database/schema.ts:</Text>
                <Text color="gray">     export * from '../features/{kebab}/{kebab}.schema';</Text>
                <Text color="gray"> </Text>
                <Text color="gray">  2. Register module in server.cloudflare.ts:</Text>
                <Text color="gray">     import {'{'} {pascal}Module {'}'} from './features/{kebab}';</Text>
                <Text color="gray">     modules: [..., {pascal}Module]</Text>
                <Text color="gray"> </Text>
                <Text color="gray">  3. Generate + apply migration:</Text>
                <Text color="gray">     cruz db generate && cruz db migrate</Text>
              </>
            )}
            <Text color="gray"> </Text>
            <Info>  Generated tRPC procedures:</Info>
            <Text color="gray">     trpc.{camel}.list   · .getById · .create · .update · .delete</Text>
            <Info>  Generated REST endpoints:</Info>
            <Text color="gray">     GET/POST /api/{kebab}  ·  GET/PATCH/DELETE /api/{kebab}/:id</Text>
          </Box>
        </Box>
      ) : (
        <Text color="gray">Scaffolding CRUD module...</Text>
      )}
    </Box>
  );
};

export default NewCrud;
