---
title: Azure Adapter
description: Deploy CruzJS on Azure Functions or Container Apps with Azure Database for PostgreSQL, Redis, Blob Storage, and Service Bus.
---

## Installation

```bash
npm install @cruzjs/adapter-azure
```

## Azure Functions

Best for: Serverless APIs, event-driven workloads, pay-per-execution billing.

```typescript
import { AzureFunctionsAdapter } from '@cruzjs/adapter-azure';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AzureFunctionsAdapter({
    databaseUrl: process.env.DATABASE_URL,
    openaiApiKey: process.env.AZURE_OPENAI_API_KEY,
    openaiBaseUrl: process.env.AZURE_OPENAI_ENDPOINT,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Azure Container Apps

Best for: Microservices, high-traffic apps, long-running processes.

```typescript
import { AzureContainerAppsAdapter } from '@cruzjs/adapter-azure';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AzureContainerAppsAdapter({
    databaseUrl: process.env.DATABASE_URL,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Service Mapping

| CruzJS Binding | Azure Service |
|----------------|------------|
| Database | Azure Database for PostgreSQL (Flexible Server) |
| Cache | Azure Cache for Redis |
| Storage | Azure Blob Storage |
| Queue | Azure Service Bus |
| AI | Azure OpenAI Service |

## Database Setup (Azure Database for PostgreSQL)

### Flexible Server

Azure Database for PostgreSQL Flexible Server is the recommended option for CruzJS deployments.

```bash
# Create a PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group my-cruz-rg \
  --name my-cruz-db \
  --location eastus \
  --admin-user cruzuser \
  --admin-password 'YourSecurePassword!' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32

# Create the database
az postgres flexible-server db create \
  --resource-group my-cruz-rg \
  --server-name my-cruz-db \
  --database-name cruzdb

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group my-cruz-rg \
  --name my-cruz-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Connection String

```bash
DATABASE_URL=postgresql://cruzuser:YourSecurePassword!@my-cruz-db.postgres.database.azure.com:5432/cruzdb?sslmode=require
```

### VNet Integration

For production, use VNet integration to keep database traffic private:

```bash
az postgres flexible-server create \
  --resource-group my-cruz-rg \
  --name my-cruz-db \
  --vnet my-cruz-vnet \
  --subnet my-db-subnet \
  --private-dns-zone my-cruz-dns.postgres.database.azure.com
```

## Cache Setup (Azure Cache for Redis)

Azure Cache for Redis maps to CruzJS's `CacheBinding` interface.

### Creating a Redis Cache

```bash
az redis create \
  --resource-group my-cruz-rg \
  --name my-cruz-cache \
  --location eastus \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false
```

### Configuration

```typescript
new AzureFunctionsAdapter({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  // ...
})
```

```bash
# Get the connection string
az redis list-keys --resource-group my-cruz-rg --name my-cruz-cache

REDIS_URL=rediss://:YourAccessKey@my-cruz-cache.redis.cache.windows.net:6380
```

The `rediss://` protocol (with double 's') indicates TLS, which Azure Cache for Redis requires.

## Storage Setup (Azure Blob Storage)

Blob Storage maps to CruzJS's storage binding for file uploads and media.

### Creating a Storage Account

```bash
# Create a storage account
az storage account create \
  --resource-group my-cruz-rg \
  --name mycruzuploads \
  --location eastus \
  --sku Standard_LRS

# Create a container
az storage container create \
  --account-name mycruzuploads \
  --name uploads \
  --public-access off
```

### Configuration

```typescript
new AzureFunctionsAdapter({
  databaseUrl: process.env.DATABASE_URL,
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER,
  // ...
})
```

```bash
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=mycruzuploads;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER=uploads
```

### CORS Configuration

```bash
az storage cors add \
  --services b \
  --methods GET PUT \
  --origins "https://myapp.com" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --account-name mycruzuploads
```

## Queue Setup (Azure Service Bus)

Service Bus maps to CruzJS's `QueueBinding` interface for reliable message processing.

### Creating a Service Bus Namespace and Queue

```bash
# Create a namespace
az servicebus namespace create \
  --resource-group my-cruz-rg \
  --name my-cruz-bus \
  --location eastus \
  --sku Basic

# Create a queue
az servicebus queue create \
  --resource-group my-cruz-rg \
  --namespace-name my-cruz-bus \
  --name cruz-jobs \
  --max-delivery-count 3 \
  --default-message-time-to-live P14D

# Create a dead-letter queue is automatic in Service Bus
```

### Configuration

```typescript
new AzureFunctionsAdapter({
  databaseUrl: process.env.DATABASE_URL,
  serviceBusConnectionString: process.env.SERVICE_BUS_CONNECTION_STRING,
  serviceBusQueueName: process.env.SERVICE_BUS_QUEUE_NAME,
  // ...
})
```

```bash
SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://my-cruz-bus.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=...
SERVICE_BUS_QUEUE_NAME=cruz-jobs
```

## AI Setup (Azure OpenAI Service)

Azure OpenAI Service provides GPT models with enterprise security, compliance, and regional availability.

### Creating an Azure OpenAI Resource

```bash
az cognitiveservices account create \
  --resource-group my-cruz-rg \
  --name my-cruz-openai \
  --kind OpenAI \
  --sku S0 \
  --location eastus
```

### Configuration

```bash
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://my-cruz-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string with `?sslmode=require` |
| `REDIS_URL` | No | Azure Cache for Redis connection string |
| `AZURE_STORAGE_CONNECTION_STRING` | No | Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER` | No | Blob Storage container name |
| `SERVICE_BUS_CONNECTION_STRING` | No | Service Bus connection string |
| `SERVICE_BUS_QUEUE_NAME` | No | Service Bus queue name |
| `AZURE_OPENAI_API_KEY` | No | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI endpoint URL |
| `AUTH_SECRET` | Yes | Session encryption key |

## Deployment with `az` CLI

### Azure Functions

```bash
# Build the CruzJS app
cruz build

# Create a Function App
az functionapp create \
  --resource-group my-cruz-rg \
  --name my-cruz-func \
  --storage-account mycruzuploads \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux

# Set environment variables
az functionapp config appsettings set \
  --resource-group my-cruz-rg \
  --name my-cruz-func \
  --settings \
    DATABASE_URL="postgresql://..." \
    AUTH_SECRET="$(openssl rand -base64 32)"

# Deploy
func azure functionapp publish my-cruz-func
```

### Azure Container Apps

```bash
# Create a Container Apps environment
az containerapp env create \
  --resource-group my-cruz-rg \
  --name my-cruz-env \
  --location eastus

# Build and push Docker image
az acr build \
  --registry mycruzregistry \
  --image my-cruz-app:latest .

# Deploy to Container Apps
az containerapp create \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --environment my-cruz-env \
  --image mycruzregistry.azurecr.io/my-cruz-app:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars \
    DATABASE_URL="postgresql://..." \
    AUTH_SECRET="$(openssl rand -base64 32)" \
  --min-replicas 0 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi
```

## Runtime Type

- **Azure Functions**: `serverless` -- Scale-to-zero functions. `waitUntil()` must be flushed before response returns.
- **Container Apps**: `container` -- Auto-scaling containers. `waitUntil()` is fire-and-forget.
