# @cruzjs/start

Starter kit features for CruzJS applications. Provides common functionality out of the box.

## Features

- **User Profiles** — Extended user profiles with avatars, bio, preferences, onboarding
- **API Keys** — Org-scoped API key management with scopes and revocation
- **Dashboard** — Configurable dashboard layouts with widget system
- **Notifications** — Multi-channel notifications (in-app, email, Slack)
- **Real-Time Events** — Live event feed with SSE streaming
- **Integrations** — Third-party integrations (Jira, Linear, Figma, Sentry)
- **AI Connections** — Connect AI providers (Anthropic, OpenAI, Gemini, Fireworks)

## Installation

```bash
npm install @cruzjs/start
```

## Peer Dependencies

- `@cruzjs/core` >= 0.1.0
- `@cruzjs/saas` >= 0.1.0
- `drizzle-orm` >= 0.36.0
- `inversify` >= 7.0.0
- `zod` >= 3.0.0

## Quick Start

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { StartModule } from '@cruzjs/start';
import * as schema from './database/schema';

export default createCruzApp({
  schema,
  modules: [StartModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

`StartModule` registers all feature modules at once (orgs, members, permissions, UI components).
