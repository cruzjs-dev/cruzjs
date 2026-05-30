---
title: Azure Container Apps
description: Deploy CruzJS on Azure Container Apps with KEDA auto-scaling, managed identity, Dapr integration, and fire-and-forget waitUntil().
---

Azure Container Apps is a managed container platform built on Kubernetes. It provides auto-scaling via KEDA, built-in ingress, and optional Dapr integration. CruzJS runs as a long-lived container with fire-and-forget `waitUntil()` support.

## When to Use Container Apps

- Sustained or high traffic
- You need `waitUntil()` fire-and-forget behavior
- You want managed identity (no passwords in config)
- You need custom system dependencies or binaries
- You want Dapr for service-to-service communication

For low traffic or event-driven workloads, consider [Azure Functions](/adapters/azure-functions) instead.

## Full Adapter Configuration

```typescript
import { AzureContainerAppsAdapter } from '@cruzjs/adapter-azure';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AzureContainerAppsAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER,
    serviceBusConnectionString: process.env.SERVICE_BUS_CONNECTION_STRING,
    serviceBusQueueName: process.env.SERVICE_BUS_QUEUE_NAME,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## `waitUntil()` Behavior

Container Apps runs as `container` runtime type. The container stays alive between requests, so `waitUntil()` tasks execute as fire-and-forget -- the response is sent immediately and background work continues.

## Auto-Scaling with KEDA

Container Apps uses KEDA for event-driven scaling. The default HTTP scaler works for most CruzJS apps:

```bash
az containerapp create \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --environment my-cruz-env \
  --image mycruzregistry.azurecr.io/my-cruz-app:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi \
  --scale-rule-name http-rule \
  --scale-rule-http-concurrency 50
```

| Setting | Purpose |
|---------|---------|
| `--min-replicas 1` | Avoids cold starts by keeping one instance warm |
| `--min-replicas 0` | Enables scale-to-zero for dev/staging |
| `--scale-rule-http-concurrency 50` | Scale up when requests per instance exceed 50 |

## Managed Identity

Managed identity is the recommended way to connect to Azure services in production. It eliminates passwords and connection strings.

```bash
# Enable system-assigned identity
az containerapp identity assign \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --system-assigned

# Grant access to PostgreSQL
az postgres flexible-server ad-admin create \
  --resource-group my-cruz-rg \
  --server-name my-cruz-db \
  --display-name my-cruz-app \
  --object-id $(az containerapp identity show --resource-group my-cruz-rg --name my-cruz-app --query principalId -o tsv)

# Grant access to Blob Storage
az role assignment create \
  --assignee $(az containerapp identity show --resource-group my-cruz-rg --name my-cruz-app --query principalId -o tsv) \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/.../resourceGroups/my-cruz-rg/providers/Microsoft.Storage/storageAccounts/mycruzuploads
```

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx cruz build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build/server/index.js"]
```

## Health Probes

Container Apps supports liveness, readiness, and startup probes:

```bash
az containerapp update \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --set-env-vars="HEALTH_CHECK_PATH=/healthz" \
  --probe-type liveness \
  --probe-path /healthz \
  --probe-period 10 \
  --probe-timeout 5 \
  --probe-failure-threshold 3
```

CruzJS includes a built-in `/healthz` endpoint that returns `200` when the app is ready.

## Dapr Integration (Optional)

Dapr provides service invocation, pub/sub, and state management as sidecar capabilities:

```bash
az containerapp dapr enable \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --dapr-app-id cruz-app \
  --dapr-app-port 3000 \
  --dapr-app-protocol http
```

Dapr is optional. CruzJS works without it using direct service connections.

## Deployment

```bash
# Create a Container Apps environment
az containerapp env create \
  --resource-group my-cruz-rg \
  --name my-cruz-env \
  --location eastus

# Build and push via Azure Container Registry
az acr build \
  --registry mycruzregistry \
  --image my-cruz-app:latest .

# Deploy
az containerapp create \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --environment my-cruz-env \
  --image mycruzregistry.azurecr.io/my-cruz-app:latest \
  --registry-server mycruzregistry.azurecr.io \
  --target-port 3000 \
  --ingress external \
  --env-vars \
    DATABASE_URL="postgresql://cruzuser:pw@my-cruz-db.postgres.database.azure.com:5432/cruzdb?sslmode=require" \
    AUTH_SECRET=secretref:auth-secret \
    REDIS_URL="rediss://:key@my-cruz-cache.redis.cache.windows.net:6380" \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi
```

## Next Steps

- [Deploying to Azure](/adapters/azure-deploy) -- CI/CD, Bicep, and migration workflows
- [Azure Functions](/adapters/azure-functions) -- serverless alternative
- [Azure Adapter Overview](/adapters/azure) -- service mapping and environment variables
