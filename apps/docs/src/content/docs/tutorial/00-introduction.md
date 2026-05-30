---
title: "Tutorial: Build a TaskBoard SaaS"
description: A complete guide to building a multi-tenant project management SaaS with CruzJS.
---

# Build a TaskBoard SaaS with CruzJS

In this tutorial you'll build **TaskBoard** — a multi-tenant project management app — from scratch using CruzJS. By the end you'll have a production-deployable SaaS running on Cloudflare Pages + D1.

## What you'll build

- User authentication (signup, email verification, password reset)
- Organizations with role-based access control
- Projects and tasks with real-time updates
- File attachments on tasks
- Background email notifications
- Billing with Stripe (free / pro plans)
- One-command deployment to Cloudflare

## Prerequisites

- Node.js 20+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is fine for development)
- Wrangler CLI: `npm install -g wrangler && wrangler login`

## Chapters

| Chapter | Topic |
|---------|-------|
| [01 — Create Project](/tutorial/01-create-project/) | Scaffold and run the app |
| [02 — Database Schema](/tutorial/02-database-schema/) | Define tables for projects and tasks |
| [03 — First Feature](/tutorial/03-first-feature/) | Generate and wire the tasks feature |
| [04 — Authentication](/tutorial/04-authentication/) | How auth works out of the box |
| [05 — Organizations](/tutorial/05-organizations/) | Multi-tenancy and org-scoped data |
| [06 — Permissions](/tutorial/06-permissions/) | Role-based access control |
| [07 — Real-Time](/tutorial/07-real-time/) | Live updates with BroadcastModule |
| [08 — Background Jobs](/tutorial/08-background-jobs/) | Email notifications via job queue |
| [09 — File Uploads](/tutorial/09-file-uploads/) | Attach files to tasks |
| [10 — Billing](/tutorial/10-billing/) | Stripe integration with plan limits |
| [11 — Deployment](/tutorial/11-deployment/) | Ship to production on Cloudflare |

## What we'll build

By the end of chapter 03 you'll have a working CRUD app running locally. Each subsequent chapter adds a feature. You can stop at any chapter and have a functioning app.

**Next:** [Chapter 01 — Create Project](/tutorial/01-create-project/)
