---
title: Deploying to Azure
description: CI/CD pipelines, Bicep infrastructure-as-code, and migration workflows for deploying CruzJS to Azure.
---

This guide covers the full deployment workflow for CruzJS on Azure, including GitHub Actions CI/CD, Bicep for infrastructure, and database migration strategies.

## Prerequisites

- Azure CLI authenticated (`az login`)
- A resource group created (`az group create --name my-cruz-rg --location eastus`)
- Azure Container Registry for Docker images
- Azure Database for PostgreSQL Flexible Server (see [Azure Adapter](/adapters/azure))

## Container Registry Setup

```bash
# Create a Container Registry
az acr create \
  --resource-group my-cruz-rg \
  --name mycruzregistry \
  --sku Basic \
  --admin-enabled true

# Log in to the registry
az acr login --name mycruzregistry
```

## GitHub Actions Pipeline

This workflow builds, pushes, migrates, and deploys on every push to `main`.

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]

env:
  REGISTRY: mycruzregistry.azurecr.io
  IMAGE: mycruzregistry.azurecr.io/cruz-app
  RESOURCE_GROUP: my-cruz-rg

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and push image
        run: |
          az acr login --name mycruzregistry
          docker build -t ${{ env.IMAGE }}:${{ github.sha }} .
          docker push ${{ env.IMAGE }}:${{ github.sha }}

      - name: Run migrations
        run: |
          az containerapp job start \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name cruz-migrate \
            --image ${{ env.IMAGE }}:${{ github.sha }} \
            --wait

      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name my-cruz-app \
            --image ${{ env.IMAGE }}:${{ github.sha }}

      - name: Verify deployment
        run: |
          az containerapp show \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --name my-cruz-app \
            --query "properties.latestRevisionFqdn" -o tsv
```

## Running Migrations

### Option 1: Container Apps Job

Create a job that runs `cruz db migrate` before each deployment:

```bash
az containerapp job create \
  --resource-group my-cruz-rg \
  --name cruz-migrate \
  --environment my-cruz-env \
  --image mycruzregistry.azurecr.io/cruz-app:latest \
  --registry-server mycruzregistry.azurecr.io \
  --trigger-type Manual \
  --cpu 0.25 \
  --memory 0.5Gi \
  --command "npx" "cruz" "db" "migrate" \
  --env-vars \
    DATABASE_URL=secretref:database-url

# Run the job
az containerapp job start \
  --resource-group my-cruz-rg \
  --name cruz-migrate \
  --wait
```

### Option 2: Startup Migration

Add migration to your container entrypoint:

```dockerfile
# entrypoint.sh
#!/bin/sh
npx cruz db migrate && node build/server/index.js
```

This works for single-replica deployments. For multi-replica, use the job approach to avoid migration races.

## Azure Key Vault

Store secrets in Key Vault instead of plain environment variables:

```bash
# Create a Key Vault
az keyvault create \
  --resource-group my-cruz-rg \
  --name my-cruz-vault \
  --location eastus

# Add secrets
az keyvault secret set --vault-name my-cruz-vault --name database-url \
  --value "postgresql://cruzuser:pw@my-cruz-db.postgres.database.azure.com:5432/cruzdb?sslmode=require"

az keyvault secret set --vault-name my-cruz-vault --name auth-secret \
  --value "$(openssl rand -base64 32)"

# Grant Container App access
az keyvault set-policy --name my-cruz-vault \
  --object-id $(az containerapp identity show -g my-cruz-rg -n my-cruz-app --query principalId -o tsv) \
  --secret-permissions get list
```

Reference secrets in Container Apps:

```bash
az containerapp secret set \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --secrets \
    database-url=keyvaultref:https://my-cruz-vault.vault.azure.net/secrets/database-url,identityref:system \
    auth-secret=keyvaultref:https://my-cruz-vault.vault.azure.net/secrets/auth-secret,identityref:system
```

## Bicep Infrastructure

```bicep
param location string = 'eastus'
param appName string = 'my-cruz-app'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: '${appName}registry'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${appName}-db'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    storage: { storageSizeGB: 32 }
    administratorLogin: 'cruzuser'
    administratorLoginPassword: 'YourSecurePassword!'
  }
}

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${appName}-cache'
  location: location
  properties: {
    sku: { name: 'Basic', family: 'C', capacity: 0 }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${appName}uploads'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${appName}-bus'
  location: location
  sku: { name: 'Basic' }

  resource queue 'queues' = {
    name: 'cruz-jobs'
    properties: { maxDeliveryCount: 3 }
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${appName}-env'
  location: location
  properties: {}
}

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: appName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: { external: true, targetPort: 3000 }
      registries: [{ server: acr.properties.loginServer, identity: 'system' }]
    }
    template: {
      containers: [{
        name: appName
        image: '${acr.properties.loginServer}/${appName}:latest'
        resources: { cpu: json('0.5'), memory: '1Gi' }
      }]
      scale: { minReplicas: 1, maxReplicas: 10 }
    }
  }
}
```

Deploy with:

```bash
az deployment group create \
  --resource-group my-cruz-rg \
  --template-file infra/main.bicep \
  --parameters appName=my-cruz-app
```

## Managed Identity Setup

Managed identity eliminates connection strings for Azure services. This is the recommended production approach.

```bash
# Enable system-assigned identity
az containerapp identity assign \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --system-assigned

# Get the principal ID
PRINCIPAL_ID=$(az containerapp identity show \
  --resource-group my-cruz-rg \
  --name my-cruz-app \
  --query principalId -o tsv)

# Grant PostgreSQL admin
az postgres flexible-server ad-admin create \
  --resource-group my-cruz-rg \
  --server-name my-cruz-db \
  --display-name my-cruz-app \
  --object-id $PRINCIPAL_ID

# Grant Blob Storage access
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/.../resourceGroups/my-cruz-rg/providers/Microsoft.Storage/storageAccounts/mycruzuploads

# Grant Service Bus access
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Azure Service Bus Data Sender" \
  --scope /subscriptions/.../resourceGroups/my-cruz-rg/providers/Microsoft.ServiceBus/namespaces/my-cruz-bus
```

## Next Steps

- [Azure Functions](/adapters/azure-functions) -- serverless runtime details
- [Azure Container Apps](/adapters/azure-container-apps) -- container runtime details
- [Azure Adapter Overview](/adapters/azure) -- service mapping and environment variables
