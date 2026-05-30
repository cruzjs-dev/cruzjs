# @cruzjs/skills

Claude Code commands, knowledge base, and agent personas for CruzJS development.

## Setup

```bash
npx @cruzjs/skills init
```

This copies into your project:

- **13 slash commands** — `/dev`, `/new-feature`, `/add`, `/debug`, `/code-review`, `/qa`, and more
- **27 knowledge base docs** — covering every CruzJS pattern (DI, tRPC, auth, database, UI, deployment...)
- **7 agent personas** — architect, developer, code reviewer, QA engineer, UI/UX designers
- **CLAUDE.md** — project instructions and CLI reference

## Commands

| Command | What it does |
|---------|-------------|
| `/dev` | Full autonomous dev pipeline (spec → build → review → QA → PR) |
| `/new-feature` | Create a complete feature module (service, router, UI, tests) |
| `/add` | Add a field, event, test, or job to an existing feature |
| `/debug` | Diagnose and fix issues |
| `/fix-lint` | Fix TypeScript and lint errors |
| `/code-review` | Automated code review (security, patterns, data ownership) |
| `/qa` | Automated QA testing with Playwright |
| `/create-ui-component` | Build production UI component with Storybook |
| `/build-application` | Interactive wizard to build a complete app |
| `/pm` | Product spec from a feature request |
| `/architect` | Detailed implementation plan from a spec |
| `/new-ui` | Create UI (route/component/modal) for existing backend |
| `/roadmap` | Execute tasks from MASTER_PLAN.md |

## Updating

```bash
npx @cruzjs/skills update
```

Overwrites existing files with the latest versions.

## What's in the Knowledge Base

27 docs covering: architecture, TypeScript conventions, dependency injection, Drizzle ORM, tRPC routers, auth & org scoping, UI patterns, data ownership, events, testing, framework extensibility, background jobs, deployment, runtime adapters, social auth, notifications, CRUD patterns, logging, caching, flash messages, signed URLs, idempotency, policies, export/import, encrypted columns, and database factories.
