---
title: CLI Overview
description: The Cruz CLI for developing, testing, and deploying CruzJS applications.
---

The `cruz` CLI is a unified command-line tool for CruzJS development and deployment. It wraps Vite, Drizzle Kit, Wrangler, Vitest, and Playwright into a single interface, so you do not need to learn or configure each tool separately.

The CLI is built with [React Ink](https://github.com/vadimdemedes/ink), rendering interactive terminal UI with spinners, prompts, and colored output.

## Installation

The CLI is installed as a dev dependency when you scaffold a new project:

```bash
npm create @cruzjs my-app
cd my-app
npm install
```

It is available as `cruz` in your terminal (via `npx` or your package manager's bin path):

```bash
cruz --help
```

If you need to install it separately:

```bash
npm install -D @cruzjs/cli
```

## Command Categories

The CLI organizes commands into five groups:

### Development

Start, build, test, and type-check your application locally.

| Command | Description |
|---------|-------------|
| `cruz dev` | Start local dev server (runs in background) |
| `cruz dev stop` | Stop the dev server |
| `cruz dev restart` | Restart the dev server |
| `cruz dev status` | Check if the dev server is running |
| `cruz build` | Production build (React Router + Vite) |
| `cruz start` | Start the production server locally |
| `cruz test` | Run unit tests with Vitest |
| `cruz test:e2e` | Run E2E tests with Playwright |
| `cruz typecheck` | Run TypeScript type checking |

### Database

Manage your Drizzle ORM schema and Cloudflare D1 database.

| Command | Description |
|---------|-------------|
| `cruz db generate` | Generate migration files from schema changes |
| `cruz db migrate` | Apply migrations to local D1 |
| `cruz db migrate --remote` | Apply migrations to remote (production) D1 |
| `cruz db query "SQL"` | Execute raw SQL against local D1 |
| `cruz db studio` | Open Drizzle Studio for visual database browsing |
| `cruz db seed` | Run the database seed script |
| `cruz db hard-reset` | Delete local D1 data and start fresh |

### Scaffold

Generate new standalone Cloudflare Workers, Workflows, and queue consumers.

| Command | Description |
|---------|-------------|
| `cruz new worker <name>` | Scaffold a standalone Cloudflare Worker |
| `cruz new workflow <name>` | Scaffold a durable Workflow with retryable steps |
| `cruz new queue-worker <name> --queue <q>` | Scaffold a queue consumer Worker |

### Deploy

Build, migrate, and ship your application to Cloudflare.

| Command | Description |
|---------|-------------|
| `cruz init <env>` | Initialize a new environment (creates D1, KV, R2 resources) |
| `cruz deploy <env>` | Full deployment: build + migrate + deploy |
| `cruz deploy preview` | Preview deployment from the current git branch |
| `cruz status` | Show all configured environments and their state |
| `cruz destroy <env>` | Tear down an environment and its resources |

### Resources

Manage Cloudflare infrastructure resources.

| Command | Description |
|---------|-------------|
| `cruz queue create/list/delete` | Manage Cloudflare Queues |
| `cruz secrets set/list` | Manage environment secrets |
| `cruz kv create/list` | Manage KV namespaces |
| `cruz r2 create/list` | Manage R2 storage buckets |

## Global Options

These flags can be used with most commands:

| Flag | Description |
|------|-------------|
| `-e, --env <name>` | Target a specific environment |
| `-y, --yes` | Auto-confirm prompts (non-interactive mode) |
| `--remote` | Target the remote D1 database instead of local |
| `--skip-build` | Skip the build step during deployment |
| `--skip-migrate` | Skip migrations during deployment |
| `--force` | Allow destructive operations (e.g., destroying production) |

## Getting Help

Run any command with `--help` or run `cruz` with no arguments to see the full help screen:

```bash
cruz --help
cruz deploy --help
```

## Configuration

The CLI reads configuration from two sources:

- **`cruz.config.ts`** -- Defines your project name, Cloudflare bindings, and environment variables. Lives in the project root.
- **`.cruz.json`** -- Auto-generated file that stores environment state (D1 database IDs, KV namespace IDs, deployment timestamps). Managed by the CLI.

## Next Steps

- [Development Commands](/cli/development) -- local dev workflow
- [Database Commands](/cli/database) -- schema migrations and data management
- [Scaffolding](/cli/scaffolding) -- generating Workers and Workflows
- [Deployment](/cli/deploy) -- shipping to Cloudflare
- [Resource Management](/cli/resources) -- queues, secrets, KV, R2
