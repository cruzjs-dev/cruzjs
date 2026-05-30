---
title: Docker / Self-Hosted
description: Deploy CruzJS with Docker on any infrastructure -- Dokploy, Coolify, bare Docker, Docker Compose, or Kubernetes.
---

The Docker adapter lets you run CruzJS anywhere -- Dokploy, Coolify, bare Docker, Docker Compose, or Kubernetes.

## Installation

```bash
npm install @cruzjs/adapter-docker
```

## Usage

```typescript
import { DockerAdapter } from '@cruzjs/adapter-docker';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new DockerAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    s3Bucket: process.env.S3_BUCKET,
    s3Endpoint: process.env.S3_ENDPOINT, // For MinIO
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL, // For Ollama
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Service Mapping

| CruzJS Binding | Self-Hosted Service |
|----------------|-------------------|
| Database | PostgreSQL, MySQL, SQLite |
| Cache | Redis, In-memory |
| Storage | MinIO (S3-compatible), Local filesystem |
| Queue | BullMQ (Redis-backed) |
| AI | Ollama, vLLM, OpenAI API |

## Dockerfile

A multi-stage Dockerfile for production builds:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx cruz build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cruzjs

# Copy build output and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/database/migrations ./src/database/migrations

# Set ownership
RUN chown -R cruzjs:nodejs /app
USER cruzjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "build/server/index.js"]
```

### .dockerignore

```
node_modules
.git
.env
.env.*
data/
*.md
.cruz-agent/
```

## Docker Compose

A complete development and production setup with all services:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://cruz:cruz@postgres:5432/cruzdb
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: uploads
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      AUTH_SECRET: change-me-in-production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cruzdb
      POSTGRES_USER: cruz
      POSTGRES_PASSWORD: cruz
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cruz -d cruzdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped

  # Optional: Create the default bucket on startup
  minio-init:
    image: minio/mc
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
        sleep 3;
        mc alias set myminio http://minio:9000 minioadmin minioadmin;
        mc mb myminio/uploads --ignore-existing;
        exit 0;
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Running with Docker Compose

```bash
# Build and start all services
docker compose up -d

# Run database migrations
docker compose exec app npx cruz db migrate

# Seed the database (optional)
docker compose exec app npx cruz db seed

# View logs
docker compose logs -f app

# Stop all services
docker compose down
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL, MySQL, or SQLite connection string |
| `REDIS_URL` | No | Redis connection string for cache and queues |
| `S3_ENDPOINT` | No | S3-compatible endpoint (MinIO, Backblaze B2) |
| `S3_BUCKET` | No | Bucket name for file storage |
| `S3_ACCESS_KEY` | No | S3 access key |
| `S3_SECRET_KEY` | No | S3 secret key |
| `S3_REGION` | No | S3 region (default: `us-east-1`) |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `OPENAI_BASE_URL` | No | Custom OpenAI-compatible endpoint (Ollama, vLLM) |
| `AUTH_SECRET` | Yes | Session encryption key |
| `PORT` | No | Server port (default: `3000`) |

## Database Migrations in Docker

### Running Migrations on Deploy

Add a migration step to your deployment pipeline:

```bash
# Option 1: Run migrations as a separate command after deploy
docker compose exec app npx cruz db migrate

# Option 2: Run migrations in a one-off container
docker compose run --rm app npx cruz db migrate
```

### Automatic Migrations on Startup

Add a startup script that runs migrations before starting the server:

```dockerfile
# In Dockerfile
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]
```

```bash
#!/bin/sh
# start.sh
echo "Running database migrations..."
npx cruz db migrate
echo "Starting server..."
node build/server/index.js
```

:::caution
Automatic migrations on startup can cause issues with multiple replicas. Use a separate migration job or init container in production.
:::

## Health Checks

The Docker adapter responds to health check requests at `/api/health`:

```typescript
// Built-in health check response
// GET /api/health → { "status": "ok", "timestamp": "..." }
```

Configure health checks in Docker Compose:

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 5s
  start_period: 10s
  retries: 3
```

For Kubernetes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Deployment to Dokploy

[Dokploy](https://dokploy.com) is a self-hosted deployment platform (alternative to Vercel/Netlify).

1. Push your CruzJS app to a Git repository
2. In Dokploy, create a new application and connect your repository
3. Set the build method to "Dockerfile"
4. Add environment variables in the Dokploy dashboard
5. Deploy

Dokploy automatically builds your Docker image, runs it, and provides SSL via Let's Encrypt.

## Deployment to Coolify

[Coolify](https://coolify.io) is another self-hosted deployment platform.

1. Connect your Git repository in Coolify
2. Select "Docker Compose" as the build pack
3. Coolify detects your `docker-compose.yml` and deploys all services
4. Configure environment variables and domain in the Coolify dashboard

```bash
# Or deploy manually via SSH
ssh my-server "cd /opt/cruz-app && git pull && docker compose up -d --build"
```

## Deployment to Kubernetes

### Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cruz-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cruz-app
  template:
    metadata:
      labels:
        app: cruz-app
    spec:
      containers:
        - name: cruz-app
          image: myregistry/cruz-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: cruz-secrets
                  key: database-url
            - name: AUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: cruz-secrets
                  key: auth-secret
            - name: REDIS_URL
              value: redis://redis-service:6379
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: cruz-app
spec:
  selector:
    app: cruz-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

### Migration Job

Run migrations as a Kubernetes Job before deploying the new version:

```yaml
# k8s/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cruz-migrate
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myregistry/cruz-app:latest
          command: ["npx", "cruz", "db", "migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: cruz-secrets
                  key: database-url
      restartPolicy: Never
  backoffLimit: 3
```

## Runtime Type

`container` -- Long-running process. `waitUntil()` is fire-and-forget. Background jobs process in the same process via BullMQ (Redis-backed).
