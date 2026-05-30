# @cruzjs/deploy

Cloudflare deployment CLI for CruzJS applications.

## Features

- Interactive setup wizard for Cloudflare Workers
- D1 database creation and migration management
- R2 storage bucket management
- KV namespace management
- Secrets management
- Custom domain configuration

## Installation

```bash
npm install -D @cruzjs/deploy
```

## Quick Start

```bash
# Run the interactive setup wizard
npx cruz-deploy setup

# Deploy to production
npx cruz-deploy deploy -e production
```

## Commands

| Command | Description |
|---------|-------------|
| `setup` | Interactive setup wizard |
| `init [name]` | Initialize an environment |
| `deploy -e <env>` | Deploy to Cloudflare |
| `database create <name>` | Create D1 database |
| `database migrate -e <env>` | Apply D1 migrations |
| `storage create <name>` | Create R2 bucket |
| `kv create <name>` | Create KV namespace |
| `secrets set <name>` | Set a secret |
