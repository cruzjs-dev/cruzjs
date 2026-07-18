---
title: "Recipe: Adding a Package"
description: Adding a new package to the CruzJS monorepo with proper package.json, TypeScript configuration, building, and importing from other packages.
---

CruzJS is a monorepo managed with pnpm workspaces. This recipe walks through creating a new package and integrating it with the rest of the project.

## Step 1: Create the Package Directory

```bash
mkdir -p packages/my-package/src
```

## Step 2: Create package.json

```json
{
  "name": "@cruzjs/my-package",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./*": {
      "types": "./src/*.ts",
      "default": "./src/*.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "inversify": "^6.2.0",
    "reflect-metadata": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

Key points:
- Use the `@cruzjs/` scope for consistency
- `"private": true` prevents accidental publishing
- The `exports` field maps import paths to source files (no build step needed for internal packages)
- The wildcard `"./*"` export allows deep imports like `@cruzjs/my-package/services/my-service`

## Step 3: Create tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

If you don't have a shared `tsconfig.base.json`, create the full config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Step 4: Create the Entry Point

```typescript
// packages/my-package/src/index.ts
export { MyService } from './services/my-service';
export { MyModule } from './my-package.module';
export type { MyConfig } from './types';
```

## Step 5: Add Services

```typescript
// packages/my-package/src/services/my-service.ts
import { injectable, inject } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';

@injectable()
export class MyService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async doSomething(): Promise<string> {
    return 'Hello from @cruzjs/my-package';
  }
}
```

## Step 6: Create the Module

```typescript
// packages/my-package/src/my-package.module.ts
import { Module } from '@cruzjs/core/di';
import { MyService } from './services/my-service';

@Module({
  providers: [MyService],
})
export class MyModule {}
```

## Step 7: Add to Workspace

Ensure the package is included in the workspace root `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'external-processes/*'
```

If the `packages/*` glob is already there (it is by default), your new package is automatically included.

## Step 8: Add as a Dependency

Add your package as a dependency in the consuming app:

```bash
cd apps/web
pnpm add @cruzjs/my-package --workspace
```

This adds a workspace reference to `apps/web/package.json`:

```json
{
  "dependencies": {
    "@cruzjs/my-package": "workspace:*"
  }
}
```

## Step 9: Import and Use

```typescript
// src/app.server.ts
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { MyModule } from '@cruzjs/my-package';

DrizzleService.setSchema(schema);
registerModules([StartModule, MyModule]);
```

```typescript
// In any service or router
import { MyService } from '@cruzjs/my-package';

const myService = ctx.container.get(MyService);
const result = await myService.doSomething();
```

## Step 10: Add Database Schema (Optional)

If your package needs its own database tables:

```typescript
// packages/my-package/src/database/schema.ts
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

export const myTable = sqliteTable('MyTable', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
});
```

Re-export from the app's schema:

```typescript
// apps/web/src/database/schema.ts
export * from '@cruzjs/start/database/schema';
export * from '@cruzjs/my-package/database/schema';
```

Then generate migrations:

```bash
cruz db generate
cruz db migrate
```

## Package Structure Template

```
packages/my-package/
  src/
    database/
      schema.ts              # Drizzle tables (optional)
    services/
      my-service.ts          # Business logic
    events/
      my-event.ts            # Domain events (optional)
    my-package.module.ts     # @Module declaration
    index.ts                 # Public exports
    types.ts                 # Shared types
  package.json
  tsconfig.json
```

## Tips

- **No build step needed** for internal packages -- Vite and TypeScript resolve source files directly via the `exports` field
- **Avoid circular dependencies** between packages. If `@cruzjs/my-package` needs `@cruzjs/core`, that is fine. If `@cruzjs/core` needs `@cruzjs/my-package`, you have a circular dependency and should restructure
- **Keep packages focused** -- each package should have a single responsibility (analytics, notifications, integrations, etc.)
- **Re-export types** from `index.ts` so consumers have a clean import path

## Next Steps

- [CRUD Feature Recipe](/recipes/crud-feature) -- Build features within packages
- [Feature Module Recipe](/recipes/service-provider) -- Register package modules
- [Architecture](/architecture/request-lifecycle) -- Understand module loading
