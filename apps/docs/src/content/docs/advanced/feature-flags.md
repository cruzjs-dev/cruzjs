---
title: Feature Flags
description: Dynamic feature toggles with org-scoped management in CruzJS
---

CruzJS includes a feature flag system for toggling functionality at runtime without redeploying. Flags are org-scoped, so each organization can have independent flag states.

## Setup

Register the `FeatureFlagModule` in your application:

```typescript
import { FeatureFlagModule } from '@cruzjs/core/feature-flags';

export default createCruzApp({
  modules: [FeatureFlagModule],
});
```

## Creating Feature Flags

Feature flags are created via the tRPC `featureFlag.create` procedure or directly through the `FeatureFlagService`:

```typescript
// Via tRPC (from the client)
trpc.featureFlag.create.useMutation().mutate({
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: 'Enables the redesigned dashboard experience',
  enabled: false,
});
```

### Flag Properties

| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Unique slug identifier (e.g. `new-dashboard`) |
| `name` | `string` | Human-readable name |
| `description` | `string` | Optional description of what the flag controls |
| `enabled` | `boolean` | Whether the flag is active |
| `conditions` | `JSON` | Optional JSON conditions for advanced targeting |

## Checking Flags in Services

Inject `FeatureFlagService` and call `isEnabled()`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { FeatureFlagService } from '@cruzjs/core/feature-flags';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(FeatureFlagService) private readonly flags: FeatureFlagService,
  ) {}

  async getDashboardData(orgId: string) {
    const useNewDashboard = await this.flags.isEnabled('new-dashboard', orgId);

    if (useNewDashboard) {
      return this.getNewDashboardData(orgId);
    }

    return this.getLegacyDashboardData(orgId);
  }
}
```

### `evaluate` vs `isEnabled`

- `isEnabled(key, orgId)` returns a simple `boolean`
- `evaluate(key, orgId)` returns the full flag object including conditions, useful for complex targeting logic

```typescript
const flag = await this.flags.evaluate('beta-features', orgId);
// flag: { key, name, enabled, conditions, ... }
```

## Checking Flags in tRPC Routers

The same pattern works inside tRPC procedures:

```typescript
import { FeatureFlagService } from '@cruzjs/core/feature-flags';

const dashboardRouter = router({
  getData: orgProcedure.query(async ({ ctx }) => {
    const flags = ctx.container.get(FeatureFlagService);
    const isNew = await flags.isEnabled('new-dashboard', ctx.org.id);
    // ...
  }),
});
```

## tRPC Procedures

All procedures are org-scoped and require appropriate permissions.

| Procedure | Type | Description |
|-----------|------|-------------|
| `featureFlag.list` | query | List all flags for the current org |
| `featureFlag.create` | mutation | Create a new feature flag |
| `featureFlag.evaluate` | query | Evaluate a flag by key |
| `featureFlag.update` | mutation | Update flag properties (name, enabled, conditions) |
| `featureFlag.delete` | mutation | Delete a feature flag |

## Example: Gating a UI Feature

```typescript
function Dashboard() {
  const { data: flag } = trpc.featureFlag.evaluate.useQuery({
    key: 'new-dashboard',
  });

  if (flag?.enabled) {
    return <NewDashboard />;
  }

  return <LegacyDashboard />;
}
```

## Example: Gradual Rollout

Use the `conditions` field for percentage-based rollouts:

```typescript
trpc.featureFlag.create.useMutation().mutate({
  key: 'new-editor',
  name: 'New Editor',
  enabled: true,
  conditions: {
    rolloutPercentage: 25, // Enable for 25% of users
  },
});
```

Then evaluate with conditions in your service:

```typescript
const flag = await this.flags.evaluate('new-editor', orgId);
if (flag?.enabled && flag.conditions?.rolloutPercentage) {
  const hash = simpleHash(userId);
  const inRollout = (hash % 100) < flag.conditions.rolloutPercentage;
  return inRollout;
}
```
