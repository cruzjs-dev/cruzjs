# /fix-lint

Fix linting and type errors in the codebase.

## What to Check

### TypeScript Errors

- Run `npx tsc --noEmit`
- Fix type mismatches
- Add missing type annotations
- Remove unused imports

### Common Fixes

#### Missing Types

```typescript
// Error: Parameter 'x' implicitly has 'any' type
const handler = (x) => x.name;

// Fixed
const handler = (x: User) => x.name;
```

#### Unused Variables

```typescript
// Error: 'unused' is declared but never used
const { data, unused } = result;

// Fixed
const { data } = result;
```

#### Import Paths

```typescript
// Wrong: relative path
import { something } from "../../../features/thing";

// Fixed: use alias
import { something } from "@/features/thing";
```

#### Package Imports

```typescript
// Wrong: incorrect package import
import { DRIZZLE } from "@/libs/shared/database";

// Fixed: use correct package
import { DRIZZLE } from "@cruzjs/core/shared/database/drizzle.service";
```

### UI Component Issues

If using raw HTML instead of shared components:

```typescript
// Wrong - raw HTML
<div className="flex p-4">
  <p className="text-gray-600">Text</p>
</div>

// Better - can use Tailwind
<div className="flex p-4">
  <p className="text-muted-foreground">Text</p>
</div>

// Best - use shared components when available
import { Card, CardContent } from '@cruzjs/ui';

<Card className="p-4">
  <CardContent>Text</CardContent>
</Card>
```

### Export Issues

```typescript
// Wrong: trailing export
const MyComponent = () => {};
export { MyComponent };

// Fixed: inline export
export const MyComponent = () => {};
```

### Missing Return Types

```typescript
// Warning: implicit return type
async function getData() {
  return await db.select().from(items);
}

// Fixed: explicit return type
async function getData(): Promise<Item[]> {
  return await db.select().from(items);
}
```

## Commands

```bash
# Type check
npx tsc --noEmit

# Run tests
npx tsx packages/cli/src/index.tsx test

# Build (catches more errors)
npm run build
```

## Reference Docs

- `.claude/kb/02-TYPESCRIPT.md` — Conventions
- `.claude/kb/07-UI-PATTERNS.md` — UI component usage
