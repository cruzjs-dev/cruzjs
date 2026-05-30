# CruzJS Roadmap — Master Plan

Goal: close the gap between CruzJS and Laravel/Rails quality. See phase files for deep implementation specs.

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## Phase 1 — Quick Wins
*Low effort, high impact. Closes embarrassing DX gaps. ~1–2 weeks.*

- [x] P1.1 — Email preview route (`/dev/emails`)
- [x] P1.2 — Extensible email template registry (replace hardcoded switch in `template.service.ts`)
- [x] P1.3 — Email queuing via job system (`sendTemplatedEmail({ queue: true })`)
- [x] P1.4 — `createMailFake()` + `createStorageFake()` test utilities
- [x] P1.5 — `withTestTransaction()` — DB cleanup between tests via transaction rollback
- [x] P1.6 — Factory states (`defineFactory().state('admin', overrides)`)

## Phase 2 — Admin UI + Operational Dashboards
*API layer exists. Build the React frontend. ~3–4 weeks.*

- [x] P2.1 — Admin panel list UI (data table, filters, search, pagination, bulk actions, row actions)
- [x] P2.2 — Admin resource detail UI (CRUD forms auto-generated from column config)
- [x] P2.3 — Job monitoring dashboard (queue depth, failed jobs, retry, payload inspect)
- [x] P2.4 — Session management UI (active sessions list, device info, revoke button)
- [x] P2.5 — Account deletion flow (confirmation dialog, grace period, GDPR data export stub)

## Phase 3 — DX & Ergonomics
*Reduce boilerplate that every feature repeats. ~2–3 weeks.*

- [x] P3.1 — Relationship abstractions (`hasMany`, `belongsTo`, eager loading on top of Drizzle)
- [x] P3.2 — Query scopes (`defineScope` helper, composable filters)
- [x] P3.3 — HTTP testing layer (`createTestApp(handler).get('/api/users').expect(200)`)
- [x] P3.4 — Standalone named migration files (`cruz db generate:migration <name>`)

## Phase 4 — Ops & Storage
*Production safety and storage completeness. ~2–3 weeks.*

- [x] P4.1 — Image transformations (Cloudflare Images integration via `StorageService`)
- [x] P4.2 — `cruz db backup` / `cruz db restore` CLI commands
- [x] P4.3 — Migration rollback helper (`cruz db generate:rollback <migration-name>`)
- [x] P4.4 — Zero-downtime deploy health check (`cruz deploy --health-check`)

## Phase 5 — Docs & Ecosystem
*Onboarding and discoverability. Ongoing.*

- [x] P5.1 — End-to-end tutorial ("Build a todo SaaS with CruzJS" in `apps/docs`)
- [x] P5.2 — TypeDoc API reference generation wired into docs build
- [x] P5.3 — `create-cruz-app --saas` flag that installs `@cruzjs/saas` + wires billing

---

## Package Rename Tracking

- [x] Rename `packages/saas` → `packages/saas` (`@cruzjs/saas` → `@cruzjs/saas`)
- [x] Update all internal imports and re-exports
- [x] Update `apps/web` references
- [x] Update docs references
- [x] Update `create-cruz-app` template

---

## Completion Summary

Total tasks: 24
Complete: 24
Remaining: 0
