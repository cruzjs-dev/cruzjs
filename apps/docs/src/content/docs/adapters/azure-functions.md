---
title: Azure Functions
description: Deploy CruzJS on Azure Functions with serverless scaling, consumption or premium plans, and Azure Database for PostgreSQL.
---

Azure Functions is Azure's serverless compute platform. It supports scale-to-zero on the Consumption plan and warm instances on the Premium plan. CruzJS uses the Node.js v4 programming model.

## When to Use Azure Functions

- Pay-per-execution billing (Consumption plan)
- Event-driven workloads (Service Bus, Blob triggers)
- Simple deployments without containers
- You do not need `waitUntil()` fire-and-forget behavior

For sustained traffic, background work, or container-level control, use [Azure Container Apps](/adapters/azure-container-apps) instead.

## Full Adapter Configuration

```typescript
import { AzureFunctionsAdapter } from '@cruzjs/adapter-azure';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AzureFunctionsAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER,
    serviceBusConnectionString: process.env.SERVICE_BUS_CONNECTION_STRING,
    serviceBusQueueName: process.env.SERVICE_BUS_QUEUE_NAME,
    openaiApiKey: process.env.AZURE_OPENAI_API_KEY,
    openaiBaseUrl: process.env.AZURE_OPENAI_ENDPOINT,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Consumption vs Premium Plan

| Feature | Consumption | Premium (EP1+) |
|---------|------------|----------------|
| Pricing | Pay per execution | Pre-warmed instances |
| Cold starts | Yes (1-5s) | Minimal (pre-warmed) |
| Max timeout | 5 min (default), 10 min (max) | 30 min (default), unlimited |
| VNet integration | No | Yes |
| Min instances | 0 | 1+ (configurable) |

For production CruzJS apps, the **Premium plan** is recommended. It eliminates cold starts and supports VNet integration for private database access.

```bash
# Create a Premium plan
az functionapp plan create \
  --resource-group my-cruz-rg \
  --name my-cruz-plan \
  --location eastus \
  --sku EP1 \
  --is-linux true \
  --min-instances 1 \
  --max-burst 10
```

## `waitUntil()` Behavior

Azure Functions runs as `serverless` runtime type. The execution context is frozen after the response completes.

- `waitUntil()` tasks are **awaited before the response** is sent
- The adapter flushes all pending promises before returning
- For fire-and-forget patterns, publish to Service Bus and process asynchronously

## Deployment

```bash
# Build the CruzJS app
cruz build

# Create the Function App (Premium plan)
az functionapp create \
  --resource-group my-cruz-rg \
  --name my-cruz-func \
  --plan my-cruz-plan \
  --storage-account mycruzuploads \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux

# Configure app settings
az functionapp config appsettings set \
  --resource-group my-cruz-rg \
  --name my-cruz-func \
  --settings \
    DATABASE_URL="postgresql://cruzuser:pw@my-cruz-db.postgres.database.azure.com:5432/cruzdb?sslmode=require" \
    AUTH_SECRET="$(openssl rand -base64 32)" \
    REDIS_URL="rediss://:key@my-cruz-cache.redis.cache.windows.net:6380"

# Deploy
func azure functionapp publish my-cruz-func
```

## host.json Configuration

CruzJS generates a `host.json` in the build output. You can customize it:

```json
{
  "version": "2.0",
  "logging": {
    "logLevel": {
      "default": "Information",
      "Host.Results": "Error",
      "Function": "Information"
    }
  },
  "extensions": {
    "http": {
      "routePrefix": "",
      "maxConcurrentRequests": 100,
      "maxOutstandingRequests": 200
    }
  },
  "functionTimeout": "00:10:00"
}
```

## Database Connection

Use the full PostgreSQL connection string with SSL required:

```bash
DATABASE_URL=postgresql://cruzuser:YourSecurePassword!@my-cruz-db.postgres.database.azure.com:5432/cruzdb?sslmode=require
```

### VNet Integration (Premium Plan)

For private database access without public endpoints:

```bash
# Add VNet integration to the Function App
az functionapp vnet-integration add \
  --resource-group my-cruz-rg \
  --name my-cruz-func \
  --vnet my-cruz-vnet \
  --subnet my-func-subnet

# Route all traffic through VNet
az functionapp config appsettings set \
  --resource-group my-cruz-rg \
  --name my-cruz-func \
  --settings WEBSITE_VNET_ROUTE_ALL=1
```

## Redis via VNet

Azure Cache for Redis requires VNet integration on the Premium plan:

```bash
REDIS_URL=rediss://:YourAccessKey@my-cruz-cache.redis.cache.windows.net:6380
```

The `rediss://` scheme (double 's') enables TLS, which Azure requires. VNet integration must be configured for the Function App to reach the Redis instance.

## Cold Start Considerations

Cold starts are the main production concern with Azure Functions:

1. **Use Premium plan** with `--min-instances 1` to keep instances warm
2. **Reduce bundle size** -- smaller packages initialize faster
3. **Lazy-load heavy modules** -- defer imports until first use
4. **Pre-warm with scheduled ping** -- use a Timer trigger to ping the HTTP function every 5 minutes on Consumption plan

## Next Steps

- [Deploying to Azure](/adapters/azure-deploy) -- CI/CD, Bicep, and migration workflows
- [Azure Container Apps](/adapters/azure-container-apps) -- container-based alternative
- [Azure Adapter Overview](/adapters/azure) -- service mapping and environment variables
