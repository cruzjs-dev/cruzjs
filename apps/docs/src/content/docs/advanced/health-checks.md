---
title: Health Checks
description: Monitor your CruzJS application with built-in health check endpoints — database connectivity, cache status, liveness, and readiness probes.
---

CruzJS includes a `HealthService` that provides liveness, readiness, and comprehensive health check endpoints. These are essential for monitoring, load balancers, and container orchestration.

## Endpoints

The health check API is available at `/api/health`:

```
GET /api/health    →  Comprehensive health check
POST /api/health   →  Same (for monitoring tools that use POST)
```

### Health Check Response

A healthy response returns HTTP 200:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "healthy"
    },
    "cache": {
      "status": "healthy",
      "provider": "kv"
    }
  }
}
```

An unhealthy response returns HTTP 503:

```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "D1 connection failed: timeout"
    },
    "cache": {
      "status": "healthy",
      "provider": "kv"
    }
  }
}
```

## HealthService

The `HealthService` provides three check methods:

### `checkHealth()`

Performs a comprehensive health check including database connectivity and cache availability:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { HealthService } from '@cruzjs/core/shared/health/health.service';

@Injectable()
export class MonitoringService {
  constructor(
    @Inject(HealthService) private readonly health: HealthService,
  ) {}

  async getStatus() {
    const result = await this.health.checkHealth();
    // result.status: 'healthy' | 'unhealthy'
    // result.checks.database.status: 'healthy' | 'unhealthy'
    // result.checks.cache.status: 'healthy' | 'unavailable'
    return result;
  }
}
```

The database check executes `SELECT 1` against D1 to verify connectivity. The cache check reports KV availability.

### `checkReadiness()`

Checks whether the application is ready to serve traffic. Useful for deployment health gates:

```typescript
const readiness = await this.health.checkReadiness();
// readiness.status: 'ready' | 'not_ready'
```

### `checkLiveness()`

A lightweight check that always returns alive. Used by monitoring tools to verify the process is running:

```typescript
const liveness = this.health.checkLiveness();
// { status: 'alive', timestamp: '2025-01-15T10:30:00.000Z' }
```

This is a synchronous method that does not check external dependencies.

## Response Types

```typescript
type HealthCheckResult = {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database?: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    cache?: {
      status: 'healthy' | 'unavailable';
      provider: 'kv';
    };
  };
};

type ReadinessCheckResult = {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database?: {
      status: 'ready' | 'not_ready';
      error?: string;
    };
    cache?: {
      status: 'ready' | 'unavailable';
      provider: 'kv';
    };
  };
};
```

## Monitoring Integration

### Uptime Monitoring

Point your uptime monitoring service (UptimeRobot, Pingdom, Better Uptime, etc.) at:

```
GET https://your-app.pages.dev/api/health
```

Configure the monitor to:
- Alert when HTTP status is not 200
- Check the `status` field in the JSON response for `"healthy"`

### Cloudflare Health Checks

If you use Cloudflare Load Balancing, configure a health check on the `/api/health` endpoint:

```
Path: /api/health
Expected status: 200
Expected body: "healthy"
Interval: 60 seconds
```

### Response Headers

Health check responses include cache-prevention headers:

```
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
```

This ensures monitoring tools always get a fresh check rather than a cached response.

## Error Handling

If the health check itself throws an unexpected error, the endpoint returns a 503 with the error message:

```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "error": "Unexpected error during health check"
}
```

## Best Practices

1. **Monitor the health endpoint in production.** Set up alerts for HTTP 503 responses or `"unhealthy"` status. Catch database connectivity issues before users report them.

2. **Use liveness checks for basic monitoring.** If you only need to verify the Worker is running, use the liveness check. It has zero dependencies and is always fast.

3. **Do not cache health check responses.** The endpoint already sets `Cache-Control: no-cache`. Ensure your CDN or proxy does not cache these responses.

4. **Check health during deployments.** Use readiness checks as deployment gates to verify the new version can connect to D1 and KV before routing traffic to it.
