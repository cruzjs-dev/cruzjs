---
title: Maintenance Mode
description: Toggle maintenance mode with bypass tokens and custom messages in CruzJS
---

CruzJS provides a maintenance mode that returns a 503 response to all requests, with an optional bypass token for admin access during downtime.

## Setup

Register the `MaintenanceModule` in your application:

```typescript
import { MaintenanceModule } from '@cruzjs/core/maintenance';

export default createCruzApp({
  modules: [MaintenanceModule],
});
```

## Enabling Maintenance Mode

### Via tRPC (Admin)

```typescript
trpc.maintenance.enable.useMutation().mutate({
  message: 'We are upgrading our systems. Back in 30 minutes.',
});
```

### Via MaintenanceService

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { MaintenanceService } from '@cruzjs/core/maintenance';

@Injectable()
export class DeployService {
  constructor(
    @Inject(MaintenanceService) private readonly maintenance: MaintenanceService,
  ) {}

  async startMigration() {
    await this.maintenance.enable('Database migration in progress.');
    try {
      await this.runMigration();
    } finally {
      await this.maintenance.disable();
    }
  }
}
```

## Behavior When Enabled

When maintenance mode is active:

- **HTML requests** receive a 503 response with a maintenance page displaying the custom message
- **API/JSON requests** receive a 503 JSON response: `{ "error": "Service unavailable", "message": "..." }`
- **tRPC requests** receive a 503 with the maintenance message

## Bypass Token

Set the `MAINTENANCE_BYPASS_TOKEN` environment variable to allow admin access during maintenance:

```bash
MAINTENANCE_BYPASS_TOKEN=my-secret-bypass-token
```

Include the token in the `X-Maintenance-Bypass` header to skip the maintenance check:

```bash
curl -H "X-Maintenance-Bypass: my-secret-bypass-token" https://yourapp.com/admin
```

:::tip
Set a long, random bypass token. It functions as a shared secret for your team during maintenance windows.
:::

## MaintenanceService API

| Method | Returns | Description |
|--------|---------|-------------|
| `enable(message?)` | `Promise<void>` | Activate maintenance mode with optional message |
| `disable()` | `Promise<void>` | Deactivate maintenance mode |
| `getStatus()` | `Promise<{ enabled, message }>` | Get current maintenance status |
| `isEnabled()` | `Promise<boolean>` | Check if maintenance mode is active |

## tRPC Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `maintenance.getStatus` | query | Public | Check if maintenance mode is active |
| `maintenance.enable` | mutation | Admin | Enable maintenance mode |
| `maintenance.disable` | mutation | Admin | Disable maintenance mode |

The `getStatus` procedure is public so that client apps can show a maintenance banner or redirect to a maintenance page.

## Storage Backend

| Platform | Backend | Notes |
|----------|---------|-------|
| Cloudflare | KV | Maintenance state stored in KV namespace |
| Docker / Containers | In-memory | State lives in application memory |
| Development | In-memory | Resets on server restart |

## Example: Maintenance Page Component

```typescript
function MaintenanceBanner() {
  const { data } = trpc.maintenance.getStatus.useQuery(undefined, {
    refetchInterval: 30_000, // Check every 30 seconds
  });

  if (!data?.enabled) return null;

  return (
    <div className="bg-yellow-50 border-yellow-200 border p-4 text-center">
      <p className="font-medium">
        {data.message || 'The site is undergoing maintenance.'}
      </p>
    </div>
  );
}
```
