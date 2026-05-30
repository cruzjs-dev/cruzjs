---
title: Built for AI (@cruzjs/skills)
description: A portable knowledge base, command suite, and agent personas that make AI coding tools fluent in CruzJS.
---

CruzJS ships an AI toolkit — **`@cruzjs/skills`** — that teaches AI coding
assistants how the framework works. Instead of re-explaining your architecture
every session, you install a canonical knowledge base, a suite of slash
commands, and a set of agent personas once, and your assistant follows CruzJS
patterns out of the box.

It is **multi-harness**: the same content is distributed into the native config
format of five different AI coding tools.

## Install

```bash
npx @cruzjs/skills init
```

Interactive — pick which harnesses to set up. Non-interactive:

```bash
npx @cruzjs/skills init --harness=cursor
npx @cruzjs/skills update          # refresh to the latest content
```

## The canonical knowledge base

Everything starts from a single source of truth installed at
**`.cruzjs/knowledgebase/`** — harness-agnostic markdown. From there, `init`
distributes the right subset into each tool's expected location and format, so
all your assistants share one consistent picture of the project.

What gets installed:

- **34 knowledge base docs** — architecture, DI, Drizzle/D1, tRPC routers, auth &
  org scoping, data ownership, UI patterns, events, jobs, testing, deployment,
  and more.
- **13 slash commands** — repeatable workflows (see below).
- **8 agent personas** — architect, developer, developer-fix, code-reviewer,
  qa-engineer, auto-monitor, ui-designer, ux-designer.
- **Project instructions** — the entry file each harness reads automatically
  (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`).

## Supported harnesses

| Tool | Entry file | Where content lands |
|------|-----------|---------------------|
| **Claude Code** | `CLAUDE.md` | `.claude/` — `commands/`, `kb/`, `agents/personas/`, `agents/shared/`, `agents/workflows/` |
| **Cursor** | — | `.cursor/rules/*.mdc` (MDC frontmatter; domain rules auto-attach via globs) |
| **Codex (OpenAI)** | `AGENTS.md` | `.agents/skills/`, `.agents/kb/` |
| **OpenCode** | `AGENTS.md` | `.opencode/skills/`, `.opencode/kb/`, `opencode.json` |
| **Antigravity (Google)** | `GEMINI.md` | `.agent/rules/`, `.agent/skills/` |

For Cursor, domain-specific rules attach automatically by file glob — e.g. the
events KB attaches when you edit files under `**/events/**` — so the assistant
pulls the right context without being told.

## Commands

| Command | What it does |
|---------|-------------|
| `/dev` | Full autonomous dev pipeline (spec → build → review → QA → PR) |
| `/new-feature` | Scaffold a complete feature module (service, router, UI, tests) |
| `/add` | Add a field, event, test, or job to an existing feature |
| `/debug` | Diagnose and fix an issue |
| `/fix-lint` | Fix TypeScript and lint errors |
| `/code-review` | Automated review (security, patterns, data ownership) |
| `/qa` | Automated QA with Playwright |
| `/create-ui-component` | Build a production UI component with Storybook |
| `/build-application` | Interactive wizard to build a complete app |
| `/pm` | Turn a feature request into a product spec |
| `/architect` | Turn a spec into a detailed implementation plan |
| `/new-ui` | Create UI (route / component / modal) for an existing backend |
| `/roadmap` | Execute tasks from a `MASTER_PLAN.md` |

## Why it matters

Because the assistant already knows the framework's conventions, it produces
code that fits the rest of your app — correct DI wiring, the right tRPC
procedure type, tenant-safe queries that filter by `userId`/`orgId`, CUID keys,
D1-compatible schemas — without you having to spell them out each time. The same
guarantees hold whether your team is on Claude Code, Cursor, Codex, OpenCode, or
Antigravity.

:::tip
The legacy [Claude Integration](/getting-started/claude-integration) page covers
the `.claude/` directory specifically. `@cruzjs/skills` supersedes it with
multi-harness support and the canonical `.cruzjs/` knowledge base.
:::
