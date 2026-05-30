---
title: Deploying to Google Cloud
description: CI/CD pipelines, Terraform infrastructure, and migration workflows for deploying CruzJS to GCP.
---

This guide covers the full deployment workflow for CruzJS on Google Cloud, including GitHub Actions CI/CD, Terraform for infrastructure, and database migration strategies.

## Prerequisites

- `gcloud` CLI authenticated (`gcloud auth login`)
- A GCP project with billing enabled
- Artifact Registry repository for Docker images
- Cloud SQL instance (see [GCP Adapter](/adapters/gcp))

## Artifact Registry Setup

```bash
# Enable the API
gcloud services enable artifactregistry.googleapis.com

# Create a Docker repository
gcloud artifacts repositories create cruz-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="CruzJS app images"

# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## GitHub Actions Pipeline

This workflow builds, pushes, and deploys on every push to `main`.

```yaml
name: Deploy to GCP
on:
  push:
    branches: [main]

env:
  PROJECT_ID: my-gcp-project
  REGION: us-central1
  SERVICE: my-cruz-app
  REPO: cruz-repo
  IMAGE: us-central1-docker.pkg.dev/my-gcp-project/cruz-repo/cruz-app

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/${{ secrets.GCP_PROJECT_NUMBER }}/locations/global/workloadIdentityPools/github/providers/github
          service_account: github-deploy@${{ env.PROJECT_ID }}.iam.gserviceaccount.com

      - uses: google-github-actions/setup-gcloud@v2

      - name: Build and push
        run: |
          gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev --quiet
          docker build -t ${{ env.IMAGE }}:${{ github.sha }} .
          docker push ${{ env.IMAGE }}:${{ github.sha }}

      - name: Run migrations
        run: |
          gcloud run jobs execute cruz-migrate \
            --region=${{ env.REGION }} \
            --wait \
            --update-env-vars="IMAGE_TAG=${{ github.sha }}"

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE }} \
            --image=${{ env.IMAGE }}:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --no-traffic \
            --tag=canary

          gcloud run services update-traffic ${{ env.SERVICE }} \
            --region=${{ env.REGION }} \
            --to-latest
```

## Running Migrations

### Option 1: Cloud Run Job

Create a one-off Cloud Run Job that runs `cruz db migrate`:

```bash
# Create the migration job
gcloud run jobs create cruz-migrate \
  --image=us-central1-docker.pkg.dev/my-project/cruz-repo/cruz-app:latest \
  --region=us-central1 \
  --add-cloudsql-instances=my-project:us-central1:my-cruz-db \
  --set-env-vars="DATABASE_URL=postgresql://cruzuser:pw@/cruzdb?host=/cloudsql/my-project:us-central1:my-cruz-db" \
  --command="npx","cruz","db","migrate" \
  --max-retries=0

# Run it
gcloud run jobs execute cruz-migrate --region=us-central1 --wait
```

### Option 2: Startup Migration

Add a migration step to your Dockerfile entrypoint:

```dockerfile
# entrypoint.sh
#!/bin/sh
npx cruz db migrate && node build/server/index.js
```

This works but ties migration to instance startup, which can cause issues with multiple instances racing.

## Secret Manager

Store sensitive values in Secret Manager instead of environment variables:

```bash
# Create secrets
echo -n "postgresql://cruzuser:pw@/cruzdb?host=/cloudsql/..." | \
  gcloud secrets create DATABASE_URL --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create AUTH_SECRET --data-file=-

# Grant access to the Cloud Run service account
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret references
gcloud run deploy my-cruz-app \
  --update-secrets="DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest" \
  ...
```

## Terraform Example

```hcl
resource "google_cloud_run_v2_service" "app" {
  name     = "my-cruz-app"
  location = "us-central1"

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "us-central1-docker.pkg.dev/my-project/cruz-repo/cruz-app:latest"
      ports { container_port = 3000 }

      env { name = "GCS_BUCKET"; value = google_storage_bucket.uploads.name }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits   = { cpu = "1", memory = "512Mi" }
        cpu_idle = false  # cpuAlwaysAllocated
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance { instances = [google_sql_database_instance.db.connection_name] }
    }
  }
}

resource "google_sql_database_instance" "db" {
  name             = "my-cruz-db"
  database_version = "POSTGRES_16"
  region           = "us-central1"

  settings {
    tier = "db-f1-micro"
  }
}

resource "google_storage_bucket" "uploads" {
  name     = "my-cruz-uploads"
  location = "US"
}
```

## Service Accounts and IAM

The Cloud Run service account needs these roles:

| Role | Purpose |
|------|---------|
| `roles/cloudsql.client` | Connect to Cloud SQL |
| `roles/storage.objectAdmin` | Read/write GCS |
| `roles/pubsub.publisher` | Publish to Pub/Sub |
| `roles/secretmanager.secretAccessor` | Read secrets |

```bash
# Create a dedicated service account
gcloud iam service-accounts create cruz-app-sa \
  --display-name="CruzJS App"

# Grant roles
for role in cloudsql.client storage.objectAdmin pubsub.publisher secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:cruz-app-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/$role"
done
```

## Next Steps

- [Cloud Run](/adapters/gcp-cloud-run) -- runtime configuration details
- [Cloud Functions](/adapters/gcp-cloud-functions) -- serverless deployment
- [GCP Adapter Overview](/adapters/gcp) -- service mapping and environment variables
