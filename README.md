# CruzJS

A modern, extensible SaaS framework built with React Router 7, tRPC, TypeScript, and Drizzle ORM. Deploy to Cloudflare Workers.

## Packages

| Package | Description |
|---------|-------------|
| `@cruzjs/core` | Framework core — auth, DI, database, events, jobs, email, tRPC |
| `@cruzjs/saas` | Teams & billing — orgs, members, permissions, Stripe, audit logs |
| `@cruzjs/start` | Starter kit — user profiles, API keys, dashboard, notifications, integrations, AI |
| `@cruzjs/ui` | Reusable React components |
| `@cruzjs/cli` | Development CLI — dev server, build, migrations |
| `@cruzjs/deploy` | Cloudflare deployment CLI |
| `@cruzjs/create` | Project scaffolding |

## Architecture

```
@cruzjs/core          (no @cruz deps)
  ├── @cruzjs/saas     (depends on core)
  ├── @cruzjs/start   (depends on core + pro)
  └── @cruzjs/ui      (depends on pro for types)
```

## Quick Start

```bash
npm create @cruzjs my-app -- --with-pro
cd my-app
npm install
npm run dev
```

## Tech Stack

- **Runtime**: Cloudflare Workers (D1, R2, KV)
- **Framework**: React Router 7 with SSR
- **API**: tRPC for type-safe client-server communication
- **Database**: Drizzle ORM with SQLite/D1
- **DI**: Inversify with decorator-based modules
- **Auth**: Arctic for OAuth, bcrypt for passwords, JWT sessions
- **Billing**: Stripe subscriptions and metering
- **UI**: Chakra UI + Tailwind CSS

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run database migrations
npm run migrate

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Project Structure

```
cruzjs/
├── packages/
│   ├── core/           # @cruzjs/core
│   ├── pro/            # @cruzjs/saas
│   ├── start/          # @cruzjs/start
│   ├── ui/             # @cruzjs/ui
│   ├── cli/            # @cruzjs/cli
│   ├── deploy-cli/     # @cruzjs/deploy
│   └── create/
└── apps/
    └── web/            # Reference application
```
