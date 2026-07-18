---
title: Contributing
description: How to set up a development environment and contribute to CruzJS.
---

CruzJS is open source and welcomes contributions. This guide covers how to set up your development environment, the contribution workflow, and the standards your code needs to meet.

:::note
This page describes the **CruzJS framework development** structure -- the monorepo where the framework itself is built. This is different from the project structure you get when running `npm create @cruzjs`, which installs `@cruzjs/*` packages as npm dependencies. See [Directory Structure](/getting-started/directory-structure/) for the end-user project layout.
:::

## Development Setup

### Prerequisites

- **Node.js 20+**
- **pnpm** -- `npm install -g pnpm`
- **Git**

### Clone and Install

```bash
git clone https://github.com/cruzjs/cruzjs.git
cd cruzjs
pnpm install
```

### Framework Monorepo Structure

The CruzJS repository is a pnpm monorepo where the framework packages are developed and published:

```
cruzjs/
├── packages/
│   ├── core/              # @cruzjs/core — framework runtime
│   ├── start/             # @cruzjs/start — UI components, theming
│   ├── pro/               # @cruzjs/saas — billing, admin, audit logging
│   ├── cli/               # @cruzjs/cli — unified CLI
│   └── create/            # @cruzjs/create — project scaffolder
├── apps/
│   ├── web/               # Reference application (uses all packages)
│   └── docs/              # Documentation site (Astro Starlight)
├── external-processes/    # Standalone Workers, Workflows, Queue consumers
└── tests/                 # Unit and E2E tests
```

This is the **framework development** structure. End users who scaffold a project with `npm create @cruzjs` get a flat project that imports `@cruzjs/*` packages from npm -- they do not have a `packages/` directory.

### Running the Reference App

The `apps/web` directory contains a reference application that exercises all framework features. Use it for development and testing:

```bash
# Start the dev server
cruz dev

# In another terminal, run database migrations
cruz db migrate

# Optionally seed with test data
cruz db seed
```

### Running Tests

```bash
# Unit tests
cruz test

# Unit tests in watch mode
cruz test --watch

# E2E tests
cruz test:e2e

# E2E tests with Playwright UI
cruz test:e2e --ui

# Type checking
cruz typecheck
```

### Building Packages

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm --filter @cruzjs/core build
```

## Contribution Workflow

### 1. Find or Create an Issue

Before starting work, check the [issue tracker](https://github.com/cruzjs/cruzjs/issues) for existing issues. If you're proposing a new feature or significant change, open an issue first to discuss the approach.

### 2. Fork and Branch

Fork the repository and create a branch from `main`:

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/issue-123
```

Branch naming conventions:
- `feat/description` -- New features
- `fix/description` -- Bug fixes
- `docs/description` -- Documentation changes
- `refactor/description` -- Code refactoring
- `test/description` -- Test additions or fixes

### 3. Make Your Changes

Follow the coding standards described below. Keep commits focused -- one logical change per commit.

### 4. Write Tests

All new features and bug fixes need tests:

- **Services** -- Unit tests that mock the database and verify business logic
- **Routers** -- Tests that verify procedures exist and call the correct service methods
- **Components** -- Tests for non-trivial UI logic
- **Bug fixes** -- A test that reproduces the bug and passes with the fix

### 5. Run the Full Check Suite

Before submitting, verify everything passes:

```bash
cruz typecheck
cruz test
cruz test:e2e
```

### 6. Submit a Pull Request

Push your branch and open a PR against `main`. The PR description should include:

- **What** -- A clear summary of what changed
- **Why** -- The motivation (link to the issue if applicable)
- **How** -- A brief description of the implementation approach
- **Testing** -- How you tested the change

## Coding Standards

### TypeScript Conventions

**Use `type` for object shapes, not `interface`:**

```typescript
// Preferred
type UserResponse = {
  id: string;
  email: string;
};

// Only for extensible contracts
interface ModuleOptions {
  providers?: Provider[];
}
```

**Use inline named exports:**

```typescript
// Correct
export const MyComponent: React.FC<Props> = ({ title }) => { ... };
export type MyProps = { title: string };

// Incorrect
const MyComponent: React.FC<Props> = ({ title }) => { ... };
export { MyComponent };
```

**Use braces for all control flow blocks:**

```typescript
// Correct
if (!user) {
  throw new TRPCError({ code: 'NOT_FOUND' });
}

// Incorrect
if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
```

**Use async/await, not raw promises:**

```typescript
// Correct
const user = await userService.getById(id);

// Incorrect
userService.getById(id).then(user => { ... });
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Package | `@cruzjs/<name>` | `@cruzjs/core` |
| Feature directory | `kebab-case` | `user-profile` |
| Service class | `PascalCase` + `Service` | `NotesService` |
| Router | `camelCase` + `Router` | `notesRouter` |
| Module class | `PascalCase` + `Module` | `NotesModule` |
| Provider | `PascalCase` + `Provider` | `NotesProvider` |
| Schema table | `camelCase` | `notes`, `orgMembers` |
| Validation schema | `camelCase` + `Schema` | `createNoteSchema` |
| Events | `PascalCase` + `Event` | `NoteCreatedEvent` |
| Types | `PascalCase` | `NoteResponse` |

### Feature Module Structure

New features (in the reference app or user projects) should follow this file structure:

```
features/<name>/
├── index.ts                  # Barrel exports
├── <name>.module.ts          # @Module decorator
├── <name>.router.ts          # tRPC router
├── <name>.service.ts         # Business logic
├── <name>.schema.ts          # Drizzle table definition
├── <name>.validation.ts      # Zod input schemas
├── routes/                   # Feature-specific React Router routes
│   ├── index.tsx
│   └── $id.tsx
└── events/                   # Domain events (if needed)
    ├── index.ts
    └── <event-name>.event.ts
```

### Service Pattern

Services are `@Injectable()` classes that receive dependencies through constructor injection:

```typescript
@Injectable()
export class NotesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  // Public methods first
  async list(orgId: string): Promise<Note[]> { ... }
  async create(orgId: string, userId: string, input: CreateNoteInput): Promise<Note> { ... }

  // Private helpers last
  private toResponse(note: Note): NoteResponse { ... }
}
```

### Router Pattern

Routers use `orgProcedure` for org-scoped data, `protectedProcedure` for user-scoped data, and `publicProcedure` for unauthenticated endpoints. Always verify org ownership before mutations:

```typescript
export const notesRouter = router({
  update: orgProcedure
    .input(z.object({ id: z.string(), data: updateNoteSchema }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'notes:write');
      const service = ctx.container.get(NotesService);

      // Always verify ownership
      const note = await service.getById(input.id);
      if (!note || note.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return service.update(input.id, input.data);
    }),
});
```

### Database Rules

- Use CUID for primary keys (`createId()`)
- Always add `orgId` for organization-scoped data
- Always add `createdById` to track record ownership
- Index all foreign keys
- Use cascade delete on foreign key references to organizations
- Export types with `$inferSelect` and `$inferInsert`
- Export all schemas from `src/database/schema.ts`

### Testing Standards

- Test behavior, not implementation details
- Use factory functions for consistent test data
- Mock external dependencies (database, external APIs)
- Test permission checks and ownership verification
- Use descriptive test names: `it('should return empty array when org has no notes')`

```typescript
describe('NotesService', () => {
  let service: NotesService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };
    service = new NotesService(mockDb);
  });

  it('should filter notes by orgId', async () => {
    mockDb.orderBy.mockResolvedValue([]);
    await service.list('org-123');
    expect(mockDb.where).toHaveBeenCalled();
  });
});
```

## Package Boundaries

Understanding which packages to modify is important:

| Package | When to Modify |
|---------|---------------|
| `packages/core/` | Adding framework-level capabilities (new DI features, new middleware, core service changes) |
| `packages/start/` | Adding shared UI components or theming |
| `packages/saas/` | Changes to organizations, billing, permissions, or admin features |
| `packages/cli/` | New CLI commands or changes to existing commands |
| `apps/web/` | Reference app changes, demonstrating new features |
| `apps/docs/` | Documentation |

Most contributions will touch `packages/core/` or `packages/saas/` for framework features, and `apps/web/` plus `apps/docs/` for the reference implementation and documentation.

## Getting Help

- **Issues** -- Open an issue on GitHub for bugs or feature requests
- **Discussions** -- Use GitHub Discussions for questions and ideas
- **Code Review** -- All PRs are reviewed by maintainers. Expect feedback on architecture, naming, and test coverage
