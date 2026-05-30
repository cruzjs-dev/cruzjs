import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, join, relative } from 'path';
import { resolveAppDir } from '../utils/shell';

export type FeatureScope = 'org' | 'user' | 'global';

export type FieldType = 'string' | 'text' | 'number' | 'int' | 'integer' | 'float' | 'real' | 'boolean' | 'bool' | 'date' | 'datetime' | 'timestamp' | 'json' | 'uuid';

export type FieldDef = { name: string; type: FieldType };

/** Parse "title:string body:text published:boolean" from positional args */
export function parseFields(args: string[]): FieldDef[] {
  return args
    .filter(arg => arg.includes(':') && !arg.startsWith('--'))
    .map(arg => {
      const [name, type] = arg.split(':');
      return { name: toCamelCase(name), type: type as FieldType };
    });
}

type NewFeatureProps = {
  rootDir: string;
  name: string;
  scope: FeatureScope;
  crud: boolean;
  wire: boolean;
  fields?: FieldDef[];
};

// ── Auto-Wire Helpers ─────────────────────────────────────────────────────────

/**
 * Inject a module import + registration into server.cloudflare.ts.
 * Finds the createCruzApp modules array and adds the new module.
 * Returns true if successful.
 */
export function wireModule(
  rootDir: string,
  srcDir: string,
  kebab: string,
  pascal: string,
): { serverWired: boolean; schemaWired: boolean } {
  let serverWired = false;
  let schemaWired = false;

  // ── server.cloudflare.ts ──────────────────────────────────────────────────
  const serverFile = resolve(rootDir, srcDir, 'server.cloudflare.ts');
  if (existsSync(serverFile)) {
    try {
      let src = readFileSync(serverFile, 'utf-8');
      const importLine = `import { ${pascal}Module } from './features/${kebab}';\n`;
      const moduleEntry = `    ${pascal}Module,\n`;

      // Add import if not already present
      if (!src.includes(`${pascal}Module`)) {
        // Insert import before `export default createCruzApp`
        src = src.replace(
          /^(export default createCruzApp)/m,
          `${importLine}$1`,
        );

        // Add to modules array — find the last module entry and add after it
        // Match pattern: lines ending with a module reference before the closing bracket
        const modulesArrayMatch = src.match(/modules:\s*\[([^[\]]*)\]/s);
        if (modulesArrayMatch) {
          // Append after last item in modules array
          src = src.replace(
            /(modules:\s*\[)([\s\S]*?)(\s*\])/,
            (_, open, content, close) => {
              const trimmed = content.trimEnd();
              const sep = trimmed.endsWith(',') ? '\n' : ',\n';
              return `${open}${trimmed}${sep}    ${pascal}Module,${close}`;
            },
          );
        }

        writeFileSync(serverFile, src, 'utf-8');
        serverWired = true;
      }
    } catch {
      // Non-fatal — user can wire manually
    }
  }

  // ── database/schema.ts ────────────────────────────────────────────────────
  const schemaFile = resolve(rootDir, srcDir, 'database', 'schema.ts');
  if (existsSync(schemaFile)) {
    try {
      let src = readFileSync(schemaFile, 'utf-8');
      const exportLine = `export * from '../features/${kebab}/${kebab}.schema';\n`;

      if (!src.includes(`features/${kebab}`)) {
        src = src.trimEnd() + '\n' + exportLine;
        writeFileSync(schemaFile, src, 'utf-8');
        schemaWired = true;
      }
    } catch {
      // Non-fatal
    }
  }

  return { serverWired, schemaWired };
}

// ── Path Detection ───────────────────────────────────────────────────────────

/**
 * Resolve the app's src dir relative to rootDir when in a monorepo
 * (apps/<name>/src), else null for a standalone project.
 * We look for a known entry file to confirm the src dir is a real app root,
 * not just a stale leftover directory.
 */
function monorepoSrcDir(rootDir: string): string | null {
  const appDir = resolveAppDir(rootDir);
  if (appDir === rootDir) {
    return null;
  }
  const src = resolve(appDir, 'src');
  const entryFiles = [
    'server.cloudflare.ts',
    'entry.server.tsx',
    'root.tsx',
    'routes.ts',
  ];
  if (entryFiles.some((f) => existsSync(resolve(src, f)))) {
    return relative(rootDir, src);
  }
  return null;
}

/**
 * Detect the correct features directory based on project structure.
 * - Monorepo: apps/<name>/src/features
 * - Standalone: src/features
 */
export function detectFeaturesDir(rootDir: string): string {
  const src = monorepoSrcDir(rootDir);
  return src ? `${src}/features` : 'src/features';
}

/**
 * Detect the base src directory.
 * - Monorepo: apps/<name>/src
 * - Standalone: src
 */
export function detectSrcDir(rootDir: string): string {
  return monorepoSrcDir(rootDir) ?? 'src';
}

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

// ── Templates ─────────────────────────────────────────────────────────────────

function generateFiles(
  name: string,
  scope: FeatureScope,
  crud: boolean,
  fields?: FieldDef[],
): Record<string, string> {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const files: Record<string, string> = {};

  // 1. index.ts -- barrel export
  files['index.ts'] = barrelTemplate(kebab, pascal, crud);

  // 2. module
  files[`${kebab}.module.ts`] = moduleTemplate(kebab, pascal, camel, crud);

  // 3. schema
  files[`${kebab}.schema.ts`] = schemaTemplate(kebab, pascal, camel, scope, fields);

  // 4. validation
  files[`${kebab}.validation.ts`] = validationTemplate(pascal, camel, fields);

  // 5. models
  files[`${kebab}.models.ts`] = modelsTemplate(kebab, pascal, camel, fields);

  // 6. routes config
  files[`${kebab}.routes.ts`] = routesConfigTemplate(kebab, pascal);

  // 7. route page
  files[`routes/${kebab}._index.tsx`] = routePageTemplate(pascal, camel, fields);

  if (crud) {
    // 8. crud file (combines service + trpc)
    files[`${kebab}.crud.ts`] = crudTemplate(kebab, pascal, camel, scope);
  } else {
    // 8. service
    files[`${kebab}.service.ts`] = serviceTemplate(kebab, pascal, camel, scope, fields);

    // 9. trpc
    files[`${kebab}.trpc.ts`] = trpcTemplate(kebab, pascal, camel, scope);
  }

  return files;
}

// ── barrel ────────────────────────────────────────────────────────────────────

function barrelTemplate(kebab: string, pascal: string, crud: boolean): string {
  const lines: string[] = [
    `export { ${pascal}Module } from './${kebab}.module';`,
  ];

  if (crud) {
    lines.push(`export { ${pascal}Service, ${pascal}Trpc } from './${kebab}.crud';`);
  } else {
    lines.push(`export { ${pascal}Service } from './${kebab}.service';`);
    lines.push(`export { ${pascal}Trpc } from './${kebab}.trpc';`);
  }

  lines.push(`export * from './${kebab}.schema';`);
  lines.push(`export * from './${kebab}.validation';`);
  lines.push('');

  return lines.join('\n');
}

// ── module ────────────────────────────────────────────────────────────────────

function moduleTemplate(
  kebab: string,
  pascal: string,
  camel: string,
  crud: boolean,
): string {
  const serviceImport = crud
    ? `import { ${pascal}Service, ${pascal}Trpc } from './${kebab}.crud';`
    : `import { ${pascal}Service } from './${kebab}.service';\nimport { ${pascal}Trpc } from './${kebab}.trpc';`;

  return `import { Module } from '@cruzjs/core/di';
${serviceImport}
import { ${camel}Routes } from './${kebab}.routes';

@Module({
  providers: [${pascal}Service, ${pascal}Trpc],
  trpcRouters: {
    ${camel}: ${pascal}Trpc,
  },
  pageRoutes: ${camel}Routes,
})
export class ${pascal}Module {}
`;
}

// ── field type mappers ───────────────────────────────────────────────────────

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

function zodType(field: FieldDef): string {
  switch (field.type) {
    case 'string':
    case 'text':
      return 'z.string().min(1).max(500)';
    case 'uuid':
      return 'z.string().uuid()';
    case 'number':
    case 'int':
    case 'integer':
      return 'z.number().int()';
    case 'float':
    case 'real':
      return 'z.number()';
    case 'boolean':
    case 'bool':
      return 'z.boolean()';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'z.coerce.date()';
    case 'json':
      return 'z.unknown()';
    default:
      return 'z.string()';
  }
}

function tsType(field: FieldDef): string {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'uuid':
      return 'string';
    case 'number':
    case 'int':
    case 'integer':
    case 'float':
    case 'real':
      return 'number';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'Date';
    case 'json':
      return 'unknown';
    default:
      return 'string';
  }
}

function needsRealImport(fields?: FieldDef[]): boolean {
  if (!fields || fields.length === 0) return false;
  return fields.some(f => f.type === 'float' || f.type === 'real');
}

// ── schema ────────────────────────────────────────────────────────────────────

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

// ── validation ────────────────────────────────────────────────────────────────

function validationTemplate(pascal: string, camel: string, fields?: FieldDef[]): string {
  const hasFields = fields && fields.length > 0;

  if (hasFields) {
    const createEntries = fields.map(f => `  ${f.name}: ${zodType(f)},`).join('\n');
    const updateEntries = fields.map(f => `  ${f.name}: ${zodType(f)}.optional(),`).join('\n');

    return `import { z } from 'zod';

export const create${pascal}Schema = z.object({
${createEntries}
});

export const update${pascal}Schema = z.object({
${updateEntries}
});

export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>;
export type Update${pascal}Input = z.infer<typeof update${pascal}Schema>;
`;
  }

  return `import { z } from 'zod';

export const create${pascal}Schema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
});

export const update${pascal}Schema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
});

export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>;
export type Update${pascal}Input = z.infer<typeof update${pascal}Schema>;
`;
}

// ── models ────────────────────────────────────────────────────────────────────

function modelsTemplate(kebab: string, pascal: string, camel: string, fields?: FieldDef[]): string {
  const hasFields = fields && fields.length > 0;

  if (hasFields) {
    const typeEntries = fields.map(f => `  ${f.name}: ${tsType(f)};`).join('\n');
    const mapEntries = fields.map(f => `    ${f.name}: item.${f.name},`).join('\n');

    return `import type { ${pascal} } from './${kebab}.schema';

export type ${pascal}Response = {
  id: string;
${typeEntries}
  createdAt: Date;
  updatedAt: Date;
};

export function to${pascal}Response(item: ${pascal}): ${pascal}Response {
  return {
    id: item.id,
${mapEntries}
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
`;
  }

  return `import type { ${pascal} } from './${kebab}.schema';

export type ${pascal}Response = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function to${pascal}Response(item: ${pascal}): ${pascal}Response {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
`;
}

// ── routes config ─────────────────────────────────────────────────────────────

function routesConfigTemplate(kebab: string, pascal: string): string {
  return `import type { RouteFactory } from '@cruzjs/core/routing';

export const ${toCamelCase(pascal)}Routes: RouteFactory = (helpers) => [
  ...helpers.prefix('${kebab}', [
    helpers.index('features/${kebab}/routes/${kebab}._index.tsx'),
  ]),
];
`;
}

// ── route page ────────────────────────────────────────────────────────────────

function routePageTemplate(pascal: string, camel: string, fields?: FieldDef[]): string {
  const pluralPascal = pluralizePascal(pascal);
  const pluralCamel = pluralizeCamel(camel);
  const hasFields = fields && fields.length > 0;

  let itemContent: string;
  if (hasFields) {
    // First field as the heading, rest as detail lines
    const [first, ...rest] = fields;
    const heading = `            <h3 className="font-medium text-slate-900">{item.${first.name}}</h3>`;
    const details = rest.map(f => {
      if (f.type === 'boolean' || f.type === 'bool') {
        return `            <p className="text-sm text-slate-600 mt-1">${f.name}: {item.${f.name} ? 'Yes' : 'No'}</p>`;
      }
      if (f.type === 'date' || f.type === 'datetime' || f.type === 'timestamp') {
        return `            <p className="text-sm text-slate-600 mt-1">${f.name}: {new Date(item.${f.name}).toLocaleDateString()}</p>`;
      }
      if (f.type === 'json') {
        return `            <p className="text-sm text-slate-600 mt-1">${f.name}: {JSON.stringify(item.${f.name})}</p>`;
      }
      return `            <p className="text-sm text-slate-600 mt-1">${f.name}: {item.${f.name}}</p>`;
    }).join('\n');
    itemContent = details ? `${heading}\n${details}` : heading;
  } else {
    itemContent = `            <h3 className="font-medium text-slate-900">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-slate-600 mt-1">{item.description}</p>
            )}`;
  }

  return `import { trpc } from '@/trpc/client';

export default function ${pascal}IndexPage() {
  const { data, isLoading, error } = trpc.${camel}.list.useQuery();

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">${pluralPascal}</h1>
        <p className="mt-2 text-slate-500">No ${pluralCamel} found. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">${pluralPascal}</h1>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white rounded-lg shadow-sm border border-slate-200"
          >
${itemContent}
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

// ── service ───────────────────────────────────────────────────────────────────

function serviceTemplate(
  kebab: string,
  pascal: string,
  camel: string,
  scope: FeatureScope,
  fields?: FieldDef[],
): string {
  const tableVar = pluralizeCamel(camel);
  const hasFields = fields && fields.length > 0;

  const listFilter = scope === 'org'
    ? `async list(orgId: string) {
    return this.db
      .select()
      .from(${tableVar})
      .where(eq(${tableVar}.orgId, orgId))
      .orderBy(desc(${tableVar}.createdAt));
  }`
    : scope === 'user'
    ? `async list(userId: string) {
    return this.db
      .select()
      .from(${tableVar})
      .where(eq(${tableVar}.userId, userId))
      .orderBy(desc(${tableVar}.createdAt));
  }`
    : `async list() {
    return this.db
      .select()
      .from(${tableVar})
      .orderBy(desc(${tableVar}.createdAt));
  }`;

  const createParams = scope === 'org'
    ? `orgId: string, userId: string, input: Create${pascal}Input`
    : scope === 'user'
    ? `userId: string, input: Create${pascal}Input`
    : `input: Create${pascal}Input`;

  // Build create values from fields or use default name/description
  const fieldValueLines = hasFields
    ? fields.map(f => `        ${f.name}: input.${f.name},`).join('\n')
    : `        name: input.name,\n        description: input.description,`;

  const scopeValues = scope === 'org'
    ? `        orgId,\n        createdById: userId,\n`
    : scope === 'user'
    ? `        userId,\n`
    : '';

  const createValues = `{\n${scopeValues}${fieldValueLines}\n      }`;

  return `import 'server-only';
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, desc } from 'drizzle-orm';
import { ${tableVar} } from './${kebab}.schema';
import type { Create${pascal}Input, Update${pascal}Input } from './${kebab}.validation';

@Injectable()
export class ${pascal}Service {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  ${listFilter}

  async getById(id: string) {
    const [item] = await this.db
      .select()
      .from(${tableVar})
      .where(eq(${tableVar}.id, id))
      .limit(1);
    return item ?? null;
  }

  async create(${createParams}) {
    const [item] = await this.db
      .insert(${tableVar})
      .values(${createValues})
      .returning();
    return item;
  }

  async update(id: string, input: Update${pascal}Input) {
    const [item] = await this.db
      .update(${tableVar})
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(${tableVar}.id, id))
      .returning();
    return item ?? null;
  }

  async delete(id: string) {
    await this.db
      .delete(${tableVar})
      .where(eq(${tableVar}.id, id));
  }
}
`;
}

// ── trpc ──────────────────────────────────────────────────────────────────────

function trpcTemplate(
  kebab: string,
  pascal: string,
  camel: string,
  scope: FeatureScope,
): string {
  const procedure = scope === 'org' ? 'orgProcedure' : 'protectedProcedure';
  const procedureImport = scope === 'org'
    ? `import { orgProcedure } from '@cruzjs/core/trpc/context';`
    : `import { protectedProcedure } from '@cruzjs/core/trpc/context';`;

  const listBody = scope === 'org'
    ? `this.service.list(ctx.org.orgId)`
    : scope === 'user'
    ? `this.service.list(ctx.session.user.id)`
    : `this.service.list()`;

  const getGuard = scope === 'org'
    ? `
      if (!item || item.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '${pascal} not found' });
      }`
    : scope === 'user'
    ? `
      if (!item || item.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '${pascal} not found' });
      }`
    : `
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '${pascal} not found' });
      }`;

  const createCall = scope === 'org'
    ? `this.service.create(ctx.org.orgId, ctx.org.userId, input)`
    : scope === 'user'
    ? `this.service.create(ctx.session.user.id, input)`
    : `this.service.create(input)`;

  return `import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
${procedureImport}
import { ${pascal}Service } from './${kebab}.service';
import { create${pascal}Schema, update${pascal}Schema } from './${kebab}.validation';

@Router()
export class ${pascal}Trpc extends TrpcRouter {
  @Inject(${pascal}Service) private service!: ${pascal}Service;

  @Route() list = ${procedure}.query(async ({ ctx }) =>
    ${listBody});

  @Route() get = ${procedure}
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await this.service.getById(input.id);${getGuard}
      return item;
    });

  @Route() create = ${procedure}
    .input(create${pascal}Schema)
    .mutation(async ({ ctx, input }) =>
      ${createCall});

  @Route() update = ${procedure}
    .input(z.object({ id: z.string(), data: update${pascal}Schema }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.service.getById(input.id);${getGuard}
      return this.service.update(input.id, input.data);
    });

  @Route() delete = ${procedure}
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.service.getById(input.id);${getGuard}
      await this.service.delete(input.id);
      return { success: true };
    });
}
`;
}

// ── crud (combined service + trpc via createCrud) ─────────────────────────────

function crudTemplate(
  kebab: string,
  pascal: string,
  camel: string,
  scope: FeatureScope,
): string {
  const tableVar = pluralizeCamel(camel);
  const tableName = pluralizePascal(pascal);

  return `import { createCrud } from '@cruzjs/core';
import { ${tableVar} } from './${kebab}.schema';
import { create${pascal}Schema, update${pascal}Schema } from './${kebab}.validation';

export const {
  Service: ${pascal}Service,
  Trpc: ${pascal}Trpc,
} = createCrud({
  name: '${tableName}',
  table: ${tableVar},
  scope: '${scope}',
  createSchema: create${pascal}Schema,
  updateSchema: update${pascal}Schema,
});
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewFeature: React.FC<NewFeatureProps> = ({ rootDir, name, scope, crud, wire, fields }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [wiredServer, setWiredServer] = useState(false);
  const [wiredSchema, setWiredSchema] = useState(false);

  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const featuresDir = detectFeaturesDir(rootDir);
  const srcDir = detectSrcDir(rootDir);

  useEffect(() => {
    const run = () => {
      const targetDir = resolve(rootDir, featuresDir, kebab);

      if (existsSync(targetDir)) {
        setError(`Directory already exists: ${featuresDir}/${kebab}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      const files = generateFiles(name, scope, crud, fields);

      // Write files
      const written: string[] = [];
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = join(targetDir, relPath);
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        mkdirSync(dir, { recursive: true });
        writeFileSync(fullPath, content, 'utf-8');
        written.push(`${featuresDir}/${kebab}/${relPath}`);
      }

      setCreatedFiles(written);

      // Auto-wire if requested
      if (wire) {
        const { serverWired, schemaWired } = wireModule(rootDir, srcDir, kebab, pascal);
        setWiredServer(serverWired);
        setWiredSchema(schemaWired);
      }

      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, scope, crud, wire, fields, kebab, featuresDir, srcDir, exit]);

  const fileCount = Object.keys(generateFiles(name, scope, crud, fields)).length;
  const serverFile = `${srcDir}/server.cloudflare.ts`;
  const schemaFile = `${srcDir}/database/schema.ts`;

  return (
    <Box flexDirection="column">
      <Header title="New Feature Module" subtitle={`${kebab} (${scope}-scoped${crud ? ', CRUD' : ''})`} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created {featuresDir}/{kebab}/ ({fileCount} files)</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            {createdFiles.map((f) => (
              <Text key={f} color="gray">
                + {f}
              </Text>
            ))}
            {wiredServer && <Text color="cyan">~ {serverFile} (module registered)</Text>}
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
                <Text color="gray">  1. Register in {serverFile}:</Text>
                <Text color="gray">     import {'{'} {pascal}Module {'}'} from './features/{kebab}';</Text>
                <Text color="gray">     modules: [..., {pascal}Module]</Text>
                <Text> </Text>
                <Text color="gray">  2. Export schema in {schemaFile}:</Text>
                <Text color="gray">     export * from '../features/{kebab}/{kebab}.schema';</Text>
                <Text> </Text>
                <Text color="gray">  3. Generate + apply migration:</Text>
                <Text color="gray">     cruz db generate && cruz db migrate</Text>
              </>
            )}
          </Box>
        </Box>
      ) : (
        <Text>Scaffolding feature module...</Text>
      )}
    </Box>
  );
};

export default NewFeature;
