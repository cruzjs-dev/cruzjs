# TypeScript & React Conventions

## Type vs Interface

Use `type` for data shapes. Use `interface` only for extensible contracts (rare):

```typescript
type NoteResponse = { id: string; title: string; createdAt: Date };
type CreateNoteInput = z.infer<typeof createNoteSchema>;
```

## React Components

Use `React.FC` with arrow functions and inline named exports:

```typescript
type MyComponentProps = {
  title: string;
  onSubmit?: () => void;
};

export const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit }) => {
  return <div>{title}</div>;
};
```

## Exports

| File Type | Export Style |
|-----------|-------------|
| Route files (`features/*/routes/*.tsx`) | `export default` |
| Components | `export const Component` |
| Services | `export class Service` |
| Types | `export type Name` |
| Routers | `export const router` |

Always use inline exports, never trailing `export { ... }`.

## Zod Validation

```typescript
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
```

## Error Handling

In tRPC routers — use `TRPCError`:

```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' });
throw new TRPCError({ code: 'CONFLICT', message: 'Already exists' });
```

In services — throw plain `Error` (tRPC catches and wraps):

```typescript
throw new Error('Database operation failed');
```

## Null Handling

```typescript
const name = user.name ?? 'Unknown';      // nullish coalescing
const role = member?.role;                 // optional chaining
const [item] = await db.select()...;
return item ?? null;                       // NOT item || null
```

## Async/Await

Always use async/await. Never use raw `.then()` chains.

## Control Flow

Always use braces:

```typescript
if (!user) {
  throw new TRPCError({ code: 'NOT_FOUND' });
}
```

## Class Organization

```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  // Public methods first
  async create(...) { }
  async list(...) { }

  // Private helpers last
  private toResponse(item: MyItem): MyResponse { }
}
```

## Destructuring

```typescript
// Props
export const UserCard: React.FC<Props> = ({ user, onEdit }) => { };

// tRPC context
list: orgProcedure.query(async ({ ctx }) => {
  const { orgId, userId } = ctx.org;
});
```
