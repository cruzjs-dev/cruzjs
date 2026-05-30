# TypeScript Conventions

## Functional React Components

Use `React.FC` with arrow functions:

```typescript
type MyComponentProps = {
  title: string;
  onSubmit?: () => void;
  children?: React.ReactNode;
};

export const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit, children }) => {
  return (
    <Box>
      <Heading>{title}</Heading>
      {children}
    </Box>
  );
};
```

## Type vs Interface

Use `type` for object shapes:

```typescript
// Use type for data shapes
type UserResponse = {
  id: string;
  email: string;
  profile?: ProfileData;
};

// Use interface only for extensible contracts (rare)
export interface ModuleOptions {
  providers?: Provider[];
  trpcRouters?: Record<string, AnyRouter>;
}
```

## Imports

Use package aliases:

```typescript
// Package imports
import { createCruzApp, getAppContainer } from '@cruzjs/core';
import { router, orgProcedure, DRIZZLE, DrizzleDatabase } from '@cruzjs/core';
import { OrgService, MemberService } from '@cruzjs/start/orgs';
import { StatCard, PageHeader } from '@cruzjs/start';

// App imports
import { userProfileTrpc } from '@cruzjs/web/features/user-profile';
import { trpc } from '@cruzjs/web/trpc/client';
import { userProfiles } from '@cruzjs/web/database/schema';
```

## Loader / Action Patterns

Use **static top-level imports** in loaders and actions. The `@react-router/dev` Vite plugin strips `loader`/`action` and their exclusive imports from the client bundle automatically. Dynamic imports inside loader bodies are not needed and should not be used.

```typescript
// ✅ CORRECT
import { handleCruzLoader } from '@cruzjs/core/routing';
import { SubredditsService } from '@/features/subreddits/subreddits.service';

export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ params, container }) => {
    const service = container.resolve(SubredditsService);
    const subreddit = await service.getByName(params.name!);
    if (!subreddit) throw new Response('Not Found', { status: 404 });
    return { subreddit };
  });

export default function SubredditPage() {
  const { subreddit } = useLoaderData<typeof loader>();
  // ...
}
```

Barrel `index.ts` files that mix server and client exports can confuse tree-shaking. If a barrel re-exports both a service and a React component, import services directly from their source file rather than through the barrel.

## Exports

| File Type | Export Style |
|-----------|--------------|
| Route files (`routes/**/*.tsx`) | `export default` |
| Components | `export const Component` |
| Services | `export class Service` |
| Types/Models | `export type Name` |
| Functions | `export const fn` |
| Routers | `export const router` |

```typescript
// Route file (routes/dashboard.tsx)
export default function DashboardPage() {
  return <Dashboard />;
}

// Component file (components/Dashboard.tsx)
export const Dashboard: React.FC<DashboardProps> = ({ ... }) => { ... };

// Service file
@injectable()
export class MemberService { ... }

// Type file
export type MemberResponse = { ... };
```

## Inline Named Exports

Always use inline exports, not trailing export objects:

```typescript
// CORRECT
export const Dashboard: React.FC = () => { ... };
export type DashboardProps = { ... };

// WRONG - Don't do this
const Dashboard: React.FC = () => { ... };
export { Dashboard };
```

## Control Flow

Use braces for all blocks:

```typescript
// CORRECT
if (!user) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
}

// WRONG
if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
```

## Class Organization

```typescript
@injectable()
export class MyService {
  // Constructor with DI
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  // Public methods first (alphabetical or logical order)
  async create(orgId: string, userId: string, input: CreateInput): Promise<MyResponse> {
    const [item] = await this.db.insert(myItems).values({ ... }).returning();
    await this.events.dispatch(new ItemCreatedEvent(item.id, orgId));
    return this.toResponse(item);
  }

  async getById(id: string): Promise<MyResponse | null> {
    const item = await this.findById(id);
    return item ? this.toResponse(item) : null;
  }

  async list(orgId: string): Promise<MyResponse[]> {
    const items = await this.db.select().from(myItems).where(eq(myItems.orgId, orgId));
    return items.map(this.toResponse);
  }

  // Private helpers last
  private async findById(id: string): Promise<MyItem | null> {
    const [item] = await this.db.select().from(myItems).where(eq(myItems.id, id)).limit(1);
    return item ?? null;
  }

  private toResponse(item: MyItem): MyResponse {
    return { id: item.id, name: item.name, createdAt: item.createdAt };
  }
}
```

## Validation Schemas (Zod)

```typescript
import { z } from 'zod';

// Create schema - all required fields
export const createItemSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Update schema - all fields optional
export const updateItemSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Infer types from schemas
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
```

## Error Handling

```typescript
import { TRPCError } from '@trpc/server';

// In tRPC procedures
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Item not found',
});

throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'Permission denied',
});

throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid input',
});

// In services (let tRPC catch and wrap)
throw new Error('Database operation failed');
```

## Null Handling

```typescript
// Use nullish coalescing
const name = user.name ?? 'Unknown';

// Use optional chaining
const role = member?.role;

// For query results
const [item] = await this.db.select().from(items).where(eq(items.id, id)).limit(1);
return item ?? null;  // Not item || null

// Type narrowing
function processItem(item: Item | null) {
  if (!item) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  // item is now Item, not Item | null
  return item.name;
}
```

## Async/Await

Always use async/await over raw promises:

```typescript
// CORRECT
async function getUser(id: string): Promise<User> {
  const user = await userService.getById(id);
  const profile = await profileService.getByUserId(user.id);
  return { ...user, profile };
}

// WRONG
function getUser(id: string): Promise<User> {
  return userService.getById(id)
    .then(user => profileService.getByUserId(user.id)
      .then(profile => ({ ...user, profile })));
}
```

## Destructuring

```typescript
// Props destructuring
export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  const { name, email, avatarUrl } = user;
  // ...
};

// Context destructuring
export const userTrpc = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const { orgId, userId } = ctx.org;
    // ...
  }),
});
```
