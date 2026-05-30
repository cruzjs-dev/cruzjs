# Phase 5 — Docs & Ecosystem

Onboarding and discoverability. The best code is worthless if developers can't find it or learn it. This phase is what turns CruzJS from "looks interesting" to "I'm using this."

**Read before starting:** `apps/docs/` structure, `packages/create-cruz-app/`

---

## P5.1 — End-to-End Tutorial

**Goal:** A complete "Build a TaskBoard SaaS with CruzJS" tutorial in `apps/docs/` that walks through creating a real multi-tenant app from scratch. Not a feature reference — a narrative guide that builds something real.

**Why it matters:** The most-cited reason developers choose Laravel over alternatives is Laracasts and the Laravel Bootcamp. Rails Getting Started Guide is legendary. CruzJS has 95 pages of feature docs but nothing that says "start here and build something real." This is the #2 gap by impact.

**Target audience:** Developer who knows React and TypeScript, has never used CruzJS, wants to evaluate it for their next SaaS.

**Tutorial app:** "TaskBoard" — a multi-tenant project management SaaS. Chosen because it exercises every major CruzJS feature: org-scoped data, RBAC, real-time updates, background jobs, file uploads, billing.

**Files to create:**
- `apps/docs/src/content/docs/tutorial/00-introduction.md`
- `apps/docs/src/content/docs/tutorial/01-create-project.md`
- `apps/docs/src/content/docs/tutorial/02-database-schema.md`
- `apps/docs/src/content/docs/tutorial/03-first-feature.md`
- `apps/docs/src/content/docs/tutorial/04-authentication.md`
- `apps/docs/src/content/docs/tutorial/05-organizations.md`
- `apps/docs/src/content/docs/tutorial/06-permissions.md`
- `apps/docs/src/content/docs/tutorial/07-real-time.md`
- `apps/docs/src/content/docs/tutorial/08-background-jobs.md`
- `apps/docs/src/content/docs/tutorial/09-file-uploads.md`
- `apps/docs/src/content/docs/tutorial/10-billing.md`
- `apps/docs/src/content/docs/tutorial/11-deployment.md`
- `apps/docs/src/content/docs/tutorial/_meta.json` — Starlight sidebar config

**Chapter breakdown:**

**00 — Introduction:** What we're building. Screenshot of the finished app. Prerequisites (Node, Wrangler CLI). What you'll learn. Link to finished repo.

**01 — Create Project:**
```bash
npx create-cruz-app taskboard
cd taskboard
cruz dev
```
Tour the generated structure. Open localhost. Show it working.

**02 — Database Schema:** Define `projects` and `tasks` tables in `schema.ts`. Run `cruz db generate` and `cruz db migrate`. Show Drizzle Studio.

**03 — First Feature:** `cruz new feature tasks --scope org --crud --wire`. Walk through each generated file. Hit the tRPC endpoint from the browser console. Understand the pattern before adding UI.

**04 — Authentication:** Auth is pre-configured. Walk through: sign up, email verification, login, password reset. Show how `protectedProcedure` works. Add a "my tasks" query using `ctx.session.user.id`.

**05 — Organizations:** Create an org, invite a team member. Show how `orgProcedure` automatically scopes data. Demonstrate that org A cannot see org B's tasks.

**06 — Permissions:** Add `owner` vs `member` roles. `owner` can delete projects; `member` can only view. Use `requirePermission(ctx.org, 'projects:delete')`. Test with two accounts.

**07 — Real-Time:** When a task is updated, all team members see it instantly. Wire `BroadcastModule`. Show the 3-line change that makes it work.

**08 — Background Jobs:** Send a "Task assigned to you" email when a task is assigned. Use `JobService.createJob`. Show how `cruz console` can trigger a job manually for testing.

**09 — File Uploads:** Add file attachments to tasks. Use `useFileUpload()` hook + presigned URL flow. Show upload progress, file list, delete.

**10 — Billing:** Add a free/pro plan. Free plan: max 3 projects. Pro plan: unlimited. Wire `@cruzjs/saas` billing. Show upgrade flow with Stripe test cards.

**11 — Deployment:** `cruz init production`. `cruz deploy production`. Visit the live URL. Set up a custom domain. Configure env secrets.

**Writing style:** Every chapter ends with a "What we built" summary and a "Next chapter" teaser. Code examples show full file content, not just diffs (beginners get lost with diffs). GitHub links to the commit for that chapter's state.

**Done when:** A developer can follow chapters 00–03 and have a working app running locally with tasks CRUD in under 30 minutes.

---

## P5.2 — TypeDoc API Reference

**Goal:** Auto-generated API reference documentation from JSDoc/TSDoc comments in the source, published as part of the docs site. Developers can look up exact signatures of `UploadService.requestUpload()`, `defineFactory()`, etc.

**Why it matters:** Narrative docs explain concepts. API reference is what you reach for at 2am when you know what you want but need the exact parameter name. Both are required for a mature framework.

**Files to touch:**
- `apps/docs/package.json` — add `typedoc` and `typedoc-plugin-markdown`
- `apps/docs/typedoc.json` — new config file
- `apps/docs/astro.config.mjs` — integrate generated markdown into Starlight
- `packages/core/src/index.ts` — ensure all public APIs are exported (TypeDoc reads exports)
- `packages/start/src/index.ts` — same
- `Makefile` or `package.json` scripts — add `docs:api` build step

**Implementation steps:**

1. **TypeDoc config** (`apps/docs/typedoc.json`):
   ```json
   {
     "entryPoints": [
       "../../packages/core/src/index.ts",
       "../../packages/start/src/index.ts"
     ],
     "plugin": ["typedoc-plugin-markdown"],
     "out": "src/content/docs/api",
     "readme": "none",
     "categorizeByGroup": true,
     "excludePrivate": true,
     "excludeInternal": true
   }
   ```

2. **Build step**: `npm run docs:api` runs TypeDoc, outputs markdown to `src/content/docs/api/`. This directory is gitignored (generated). CI runs it before building the docs site.

3. **Starlight integration**: configure `astro.config.mjs` to include the `api/` content collection. Add "API Reference" to the sidebar.

4. **Ensure JSDoc coverage** on high-value exports:
   - All services: `EmailService`, `JobService`, `UploadService`, `StorageService`, `SessionService`
   - All test utilities: `createTestDb`, `createTestContainer`, `createMailFake`, `defineFactory`
   - All helpers: `hasMany`, `belongsTo`, `defineScope`, `withTestTransaction`
   - Framework primitives: `@Module`, `@Injectable`, `createCruzApp`, `defineFactory`
   - Validation: `protectedProcedure`, `orgProcedure`, `requirePermission`

5. **CI integration**: Add to the docs build in GitHub Actions. Docs deploy fails if TypeDoc generation fails (catches undocumented public exports).

**Done when:** `npm run docs:api` generates markdown files. The docs site builds with an "API Reference" section. `EmailService` page shows method signatures with parameter docs.

---

## P5.3 — `create-cruz-app --saas` Flag

**Goal:** `npx create-cruz-app my-app --saas` scaffolds a project with `@cruzjs/saas` pre-installed, Stripe wired, billing pages included, and the full SaaS starter configuration ready to go.

**Why it matters:** The difference between "this is a framework" and "I can ship a SaaS in a day" is the scaffolder. Laravel's `laravel new my-app --starter-kit=breeze` sets the standard. The `--saas` flag makes CruzJS a SaaS platform, not just a framework.

**Files to touch:**
- `packages/create-cruz-app/src/index.ts` — add `--saas` flag
- `packages/create-cruz-app/templates/saas/` — new template directory
- `packages/create-cruz-app/src/setup/saas-setup.ts` — new file, post-scaffold wiring

**Implementation steps:**

1. **`--saas` flag** in `create-cruz-app`:
   - Prompts if not passed: "What are you building? [1] Framework app (no billing) [2] SaaS (with billing, orgs, subscription)"
   - If `--saas`: installs `@cruzjs/saas` in addition to `@cruzjs/core` and `@cruzjs/start`

2. **`templates/saas/`** — extends the base template with:
   - `apps/web/cruz.config.ts` pre-configured with `BillingModule`
   - `apps/web/src/features/billing/` — pre-generated billing feature
   - Landing page at `/` with pricing section
   - Upgrade flow pages: `/billing`, `/billing/success`, `/billing/canceled`
   - Stripe webhook route pre-wired
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `.dev.vars.example`

3. **Interactive setup** (post-scaffold):
   - "Enter your Stripe test secret key (or press Enter to skip):" — if provided, writes to `.dev.vars`
   - "Enter your Stripe price IDs for your plans:" — configures plan definitions in `billing.config.ts`
   - "Do you want to create Stripe products now? (requires Stripe CLI)" — optional

4. **README in saas template**: "Getting started with billing" — 5-step guide: Stripe account, set env vars, run `cruz dev`, test upgrade with card `4242 4242 4242 4242`, deploy.

5. **`create-cruz-app` prompt update**: default scaffolding question becomes "Framework (no billing) / SaaS (billing + orgs)" instead of just generating one template.

**Done when:** `npx create-cruz-app my-saas --saas` creates a project. Running `cruz dev` shows a working app with a `/billing` page and Stripe integration configured. `cruz typecheck` passes in the generated project.

**Test:** E2E: run scaffolder with `--saas --skip-install`, assert key files exist: `billing.config.ts`, billing feature files, landing page route. Assert `package.json` contains `@cruzjs/saas`.
