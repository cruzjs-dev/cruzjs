---
title: Claude Integration
description: How CruzJS projects include built-in AI knowledge for Claude Code and other Claude-powered tools.
---

Every CruzJS project ships with a `.claude/` directory that gives Claude deep understanding of your application's architecture, conventions, and patterns. When you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or other Claude-powered tools, they automatically read this context and follow CruzJS best practices without any additional setup.

## What Ships with Your Project

When you scaffold a project with `@cruzjs/create`, the `.claude/` directory is included at the root:

```
.claude/
  CLAUDE.md          # Project-level instructions Claude reads automatically
  kb/
    01-ARCHITECTURE.md
    02-CONVENTIONS.md
    03-DI.md
    04-DATABASE.md
    05-TRPC.md
    06-AUTH.md
    07-UI.md
    08-DATA-OWNERSHIP.md
    09-EVENTS-JOBS.md
    10-PROVIDERS.md
    11-CLOUDFLARE.md
```

**`CLAUDE.md`** is the entry point. Claude reads this file automatically when it opens your project. It contains a summary of the monorepo structure, CLI commands, key architectural patterns, and pointers to the knowledge base files for deeper context.

**`kb/`** contains detailed knowledge base files covering every major area of the framework. Claude loads these as needed when working on relevant parts of your codebase.

## Why This Matters

Claude understands CruzJS patterns out of the box. Without any prompting or explanation, it knows:

- **The feature module structure** -- schema, service, router, and module files, and how they connect
- **Data ownership rules** -- always filter by `userId` or `orgId`, never expose data across tenant boundaries
- **The correct DI patterns** -- `@Injectable()` decorators, `@Module()` registration, `getAppContainer()` resolution
- **tRPC procedure types** -- `publicProcedure`, `protectedProcedure`, `orgProcedure`, and when to use each
- **Database conventions** -- CUID primary keys, Drizzle ORM schemas, D1 compatibility constraints
- **Cloudflare platform patterns** -- Workers bindings, KV, R2, queues, and deployment configuration

This means you can ask Claude to build features, fix bugs, or refactor code and it will follow the same patterns used throughout the rest of your application.

## What's in the Knowledge Base

Each knowledge base file covers a specific area of the framework:

| File | Topic |
|------|-------|
| `01-ARCHITECTURE.md` | Project structure, feature modules, naming conventions, domain boundaries |
| `02-CONVENTIONS.md` | TypeScript style, import ordering, error handling patterns |
| `03-DI.md` | Inversify dependency injection, container setup, service registration |
| `04-DATABASE.md` | Drizzle ORM, schema definitions, queries, migrations, D1 specifics |
| `05-TRPC.md` | API routers, procedure types, input validation with Zod |
| `06-AUTH.md` | Authentication, sessions, roles, permissions, org context |
| `07-UI.md` | React components, `@cruzjs/ui` component library, Tailwind CSS |
| `08-DATA-OWNERSHIP.md` | User-scoped vs org-scoped data, tenant isolation (critical for security) |
| `09-EVENTS-JOBS.md` | Domain events, background jobs, queue consumers |
| `10-TESTING.md` | Testing patterns and utilities |
| `11-CLOUDFLARE.md` | Platform bindings, Workers, deployment, environment management |

The data ownership file (`08-DATA-OWNERSHIP.md`) is especially important -- it ensures Claude always applies the correct scoping filters when querying data, preventing accidental cross-tenant data leaks.

## Using Claude with CruzJS

Once your project is scaffolded, open it with Claude Code and start asking for changes. Here are some example prompts that work well:

### Scaffold a new feature

```
Create a new feature called "projects" with full CRUD, org-scoped.
```

Claude will generate the complete feature module: schema with org scoping, service with filtered queries, tRPC router with `orgProcedure`, and `@Module` registration in `createCruzApp()`.

### Add background processing

```
Add a background job that sends welcome emails after user registration.
```

Claude will create the job handler, wire it into the event system, and follow the queue patterns from the knowledge base.

### Add infrastructure

```
Add a queue consumer for processing CSV imports.
```

Claude will scaffold the external process in `external-processes/`, configure the `wrangler.toml`, and set up the consumer with proper error handling and retries.

### Refactor existing code

```
Refactor the notifications feature to be org-scoped instead of user-scoped.
```

Claude will update the schema, service queries, router procedures, and any related components -- applying the org-scoping patterns consistently.

## Customizing the Knowledge Base

The `.claude/` directory is part of your project and fully customizable. You can extend it with app-specific patterns and rules.

### Add app-specific KB files

Create new files in `.claude/kb/` for patterns unique to your application:

```
.claude/kb/
  ...
  12-NOTIFICATIONS.md    # Your notification system patterns
  13-INTEGRATIONS.md     # Third-party API conventions
  14-BILLING-RULES.md    # Business logic for billing
```

Claude will load these alongside the framework KB files when working in relevant areas.

### Update project-level rules

Edit `CLAUDE.md` to add project-specific instructions. For example:

```markdown
## Project-Specific Rules

- All API responses must include `requestId` for tracing
- Use `dayjs` for date manipulation, never raw `Date`
- Feature flags are managed via KV namespace `FLAGS`
```

These instructions take priority and Claude will follow them across all tasks.

### Share with your team

Since `.claude/` is checked into version control, your entire team benefits from the same AI context. Any developer using Claude-powered tools will get consistent, project-aware assistance.

## Keeping the KB Up to Date

The knowledge base files are versioned alongside the CruzJS framework. When you upgrade CruzJS:

1. **Check the release notes** for any KB updates
2. **Compare your `.claude/kb/` files** with the latest versions from `@cruzjs/create`
3. **Merge updates** while preserving any customizations you have made

A future version of the CLI may include a dedicated command for this:

```bash
# Coming soon
cruz update-kb
```

This will diff your KB files against the latest framework versions and offer to merge updates while preserving your custom additions.

## Next Steps

- [Directory Structure](/getting-started/directory-structure) -- understand the full project layout
- [First Application](/getting-started/first-application) -- build a feature end-to-end with Claude's help
- [Configuration](/getting-started/configuration) -- customize your project settings
