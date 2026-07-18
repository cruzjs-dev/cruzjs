---
title: Multi-Database
description: Connect multiple databases with automatic routing and cross-database queries in CruzJS
---

CruzJS supports connecting to multiple databases within a single application. This is useful for multi-tenant isolation, read replicas, or separating analytics data from transactional data.

## Setup

Register the `MultiDatabaseModule` in your application:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { MultiDatabaseModule } from '@cruzjs/core/multi-database';

registerModules([StartModule, MultiDatabaseModule]);
```

## Use Cases

| Scenario | Example |
|----------|---------|
| **Tenant isolation** | Separate D1 database per tenant for data isolation |
| **Read replica** | Route reads to a replica, writes to primary |
| **Analytics DB** | Separate database for analytics queries to avoid impacting production |
| **Legacy migration** | Access both old and new databases during migration |

## Configuration

### Cloudflare (Multiple D1 Bindings)

Bind multiple D1 databases in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "main"
database_id = "xxx"

[[d1_databases]]
binding = "DB_ANALYTICS"
database_name = "analytics"
database_id = "yyy"

[[d1_databases]]
binding = "DB_TENANT_A"
database_name = "tenant-a"
database_id = "zzz"
```

### Docker (Multiple Connection Strings)

Set environment variables for each database:

```bash
DATABASE_URL=postgresql://localhost:5432/main
DATABASE_ANALYTICS_URL=postgresql://localhost:5432/analytics
DATABASE_TENANT_A_URL=postgresql://localhost:5432/tenant_a
```

## MultiDatabaseService

The `MultiDatabaseService` provides access to named database connections:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { MultiDatabaseService } from '@cruzjs/core/multi-database';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(MultiDatabaseService) private readonly multiDb: MultiDatabaseService,
  ) {}

  async getPageViews(startDate: string) {
    const analyticsDb = this.multiDb.getDatabase('analytics');

    return analyticsDb
      .select()
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate));
  }
}
```

### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getDatabase(name)` | `DrizzleDatabase` | Get a Drizzle instance for the named database |
| `listDatabases()` | `string[]` | List all available database names |

## tRPC Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `multiDatabase.list` | query | Admin | List all configured database connections |
| `multiDatabase.query` | mutation | Admin | Execute a read query against a named database |

:::caution
The `multiDatabase.query` procedure is restricted to admin users. It executes raw SQL and should be used for debugging and administration only.
:::

## Example: Tenant-Specific Database

```typescript
@Injectable()
export class TenantService {
  constructor(
    @Inject(MultiDatabaseService) private readonly multiDb: MultiDatabaseService,
  ) {}

  async getTenantData(tenantId: string) {
    const tenantDb = this.multiDb.getDatabase(`tenant-${tenantId}`);
    return tenantDb.select().from(tenantRecords);
  }
}
```

## Example: Read Replica Routing

```typescript
@Injectable()
export class ProductService {
  constructor(
    @Inject(MultiDatabaseService) private readonly multiDb: MultiDatabaseService,
    @Inject(DRIZZLE) private readonly primaryDb: DrizzleDatabase,
  ) {}

  async getProduct(id: string) {
    // Read from replica
    const replicaDb = this.multiDb.getDatabase('replica');
    return replicaDb.select().from(products).where(eq(products.id, id));
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    // Write to primary
    return this.primaryDb
      .update(products)
      .set(input)
      .where(eq(products.id, id))
      .returning();
  }
}
```
