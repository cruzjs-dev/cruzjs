---
title: About CruzJS
description: The ideology behind CruzJS — and the engineer who built it.
---

## Building full-stack apps should be insanely easy

Somewhere along the way, shipping a full-stack web application turned into an
exercise in assembly. Pick an ORM. Wire up migrations. Choose an API layer.
Bolt on validation. Add a dependency-injection container — or don't, and regret
it at scale. Build auth from scratch, then build it again when you realize you
need organizations, roles, and invitations. Stand up a queue. Configure a cache.
Decide how files get stored. Then figure out how *any* of it deploys, and glue
together the ten different config files that make it run in production.

None of these problems are new. Every one of them has been solved — beautifully,
many times over. The problem is that the solutions live in different worlds, and
**you** are the integration layer. You spend your first two weeks not building
your product, but building the *scaffolding* that lets you build your product.

CruzJS exists because that work should already be done. Building a full-stack
application should be insanely easy: you open an editor, define a feature, and
the database, the API, the types, the auth, and the deploy are simply *there* —
coherent, type-safe, and designed to work together. The framework should make
the boring decisions so you can spend your energy on the decisions that actually
differentiate your product.

This isn't a new idea. It's the idea behind the best frameworks ever made.
CruzJS is an attempt to bring the best of three of them into one place.

### Laravel is amazing

Laravel proved that a framework can be *joyful*. It's opinionated in the way a
great restaurant is opinionated — someone with taste already made the hard
calls, so you can just enjoy the meal. Migrations, an expressive ORM, queues,
events, a scheduler, mail, a first-class CLI in Artisan, and an auth system that
covers the real cases — all integrated, all consistent, all documented as one
thing rather than ten. Laravel's lesson is that **batteries-included is a
feature, not a compromise.** Developer experience, taken seriously, is a
competitive advantage. CruzJS wants that same "everything is here and it all
fits" feeling — but in TypeScript, end to end.

### React Router v7 is amazing

React Router v7 (the evolution of Remix) nailed the front of the stack. Nested
routes, loaders and actions, server-side rendering, streaming, and a data model
that treats the network as a first-class part of the UI rather than an
afterthought. It erased the artificial wall between "the page" and "the data the
page needs." React Router's lesson is that **the boundary between server and
client should be a seam, not a chasm** — you should be able to reason about a
route's data and its rendering in one mental model. CruzJS is built directly on
React Router v7, so all of that power is native, not bolted on.

### NestJS is amazing

NestJS brought real architecture to the Node backend. Dependency injection,
modules, providers, decorators, a clear separation between transport and
business logic — patterns that let an application grow from a weekend project to
a system serving hundreds of thousands of requests a day *without* collapsing
under its own weight. NestJS's lesson is that **structure is what lets software
scale — both in performance and in the size of the team that maintains it.** A
codebase with clear seams is a codebase you can still understand in year three.
CruzJS adopts that same DI-and-modules backbone (via Inversify and a `@Module`
system) so features stay decoupled, testable, and easy to reason about.

### CruzJS brings the pieces together

Each of these frameworks is brilliant at its slice. But a real product needs all
the slices at once — the front-end data model *and* the backend architecture
*and* the batteries-included ergonomics *and* a deployment story — and it needs
them to agree with each other.

That's the entire point of CruzJS. It takes React Router v7's data-driven
front-end, NestJS-style dependency injection and modules for the backend, and
Laravel's batteries-included philosophy for everything in between — database,
auth, organizations, permissions, events, jobs, queues, caching, storage, AI —
and welds them into a single, coherent, type-safe stack. The service you inject
in a tRPC router uses the same database instance your migration CLI targets.
Your auth middleware populates the same context your permission checks read.
Types flow from your schema to your API to your React component with no manual
annotation in between. And one command — `cruz deploy` — ships the whole thing
to Cloudflare's edge.

The promise is simple: **the integration work is already done.** You bring the
product. CruzJS brings everything else.

---

## About the author

CruzJS is built by **Kerry Ritter** — a software architect and engineer with
over a decade of experience building and scaling full-stack applications, and a
long history with exactly the frameworks that inspired this one.

Kerry is **Co-founder, CTO, and Principal Engineer at
[Zipper](https://joinzipper.com)**, an AI-powered operating system for modern
fitness businesses, where he architected a TypeScript/NestJS/React/AWS stack now
serving thousands of users and hundreds of thousands of requests a day — and was
previously a **Senior Software Engineer at Microsoft**, leading front-end work in
the Azure portal and rewriting legacy KnockoutJS/AngularJS platforms into modern
React. He was one of the **earliest adopters of NestJS**, building production
systems on it since its infancy; that deep, long-running experience with NestJS
architecture is a direct ancestor of CruzJS.

That history — deep NestJS architecture, years of React modernization, and a
career spent integrating the same handful of concerns over and over — is exactly
what CruzJS is a reaction to. It's the framework that brings the pieces together,
so the next full-stack app doesn't have to start from scratch.

- **GitHub:** [github.com/KerryRitter](https://github.com/KerryRitter?tab=repositories)
- **Zipper:** [joinzipper.com](https://joinzipper.com)
