---
title: "Your First Cruz App"
description: Build a full-stack to-do list app with CruzJS — from project creation to Cloudflare production deployment.
---

import { Steps, Aside } from '@astrojs/starlight/components';

This tutorial walks you through building a complete **to-do list app** with CruzJS, from scratch to a live Cloudflare Pages deployment.

By the end you will have:

- A working app with **user authentication** (sign up, log in, log out)
- A **to-do list** per user (create, complete, delete tasks)
- A **deployed production app** on Cloudflare Pages + D1

The app is intentionally simple so the focus stays on the framework patterns, not the product logic. Every pattern you learn here applies directly to real-world features.

## What You Will Build

A to-do list where each authenticated user manages their own private tasks:

- **Sign up / Log in** — handled by CruzJS's built-in auth
- **`GET /api/todos`** — list your tasks (tRPC + REST)
- **`POST /api/todos`** — create a task
- **`PATCH /api/todos/:id`** — toggle complete / update title
- **`DELETE /api/todos/:id`** — delete a task
- **A React page** at `/todos` showing the list with add/complete/delete UI

## The Full Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (edge, global) |
| Framework | CruzJS + React Router v7 |
| Database | Cloudflare D1 (SQLite at the edge) |
| ORM | Drizzle |
| API | tRPC (type-safe) + REST |
| Auth | CruzJS built-in (session-based) |
| UI | React + Tailwind CSS |
| DI | Inversify |

## Tutorial Sections

<Steps>
1. [Project Setup](/tutorial/02-project-setup) — scaffold, run dev server, understand the structure
2. [Database Schema](/tutorial/03-schema) — define the `todos` table with Drizzle
3. [Service & API](/tutorial/04-service-and-api) — `TodosService` + tRPC router
4. [React UI](/tutorial/05-ui) — the todos page with create/complete/delete
5. [Deploy to Cloudflare](/tutorial/06-deploy) — `cruz init` + `cruz deploy` to production
</Steps>

## Prerequisites

Before starting, make sure you have:

- **Node.js 20+**
- **A Cloudflare account** (free — you will need it for Step 5)
- Basic familiarity with TypeScript and React

No prior CruzJS experience is needed.

---

Ready? [Start with project setup →](/tutorial/02-project-setup)
