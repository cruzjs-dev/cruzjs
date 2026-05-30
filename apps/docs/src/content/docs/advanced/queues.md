---
title: Asynchronous Processing
description: Process work asynchronously with built-in jobs or platform message queues — choose the right tool for your workload and keep your application code portable across adapters.
---

CruzJS provides two mechanisms for asynchronous processing: the **built-in job system** (D1-backed, works everywhere) and **message queues** (platform-specific, high-throughput). This page covers when to use each and how to write adapter-agnostic queue code.

## When to Use Each

| Criteria | Built-in Jobs | Message Queues |
|----------|--------------|----------------|
| Portability | All adapters, zero config | Requires platform queue service |
| Storage | D1 database | External queue provider |
| Processing | In-app job runner | Standalone consumer process |
| Throughput | Moderate (DB polling) | High (push-based delivery) |
| Retry | Automatic with exponential backoff | Provider-managed DLQ |
| Monitoring | Admin dashboard, `JobService` queries | Platform dashboard |
| Best for | App-internal work (emails, reports, cleanup) | Cross-service messaging, high-volume events, fan-out |

**Start with jobs.** They require no infrastructure beyond your database and work identically on every adapter. Move to message queues when you need higher throughput, cross-service communication, or platform-native queue features.

## Built-in Job System

The job system stores work in D1, processes it in batches, and retries failures with exponential backoff. Because it uses the database, it works on every adapter without additional configuration.

Key capabilities:

- Priority-based processing (`CRITICAL` through `BACKGROUND`)
- Automatic retry with configurable `maxAttempts`
- Lookup keys for grouping and querying related jobs
- Scheduled execution for deferred work
- Built-in handlers for email and event listeners

See the [Background Jobs](/advanced/jobs) page for full documentation on creating handlers, dispatching jobs, and monitoring.

## Message Queues via QueueBinding

For workloads that need dedicated consumers or platform-native queue features, CruzJS provides a `QueueBinding<T>` abstraction. Your application code sends messages through a uniform interface, and the active adapter resolves the correct queue provider at runtime.

### QueueBinding Interface

Every adapter implements the same typed interface:

```typescript
interface QueueBinding<T = unknown> {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
}
```

This interface is intentionally minimal. It covers the two operations your application needs: sending a single message and sending a batch. Consumer-side APIs vary by platform and are handled outside your main application.

## Platform Queue Implementations

Each adapter maps `QueueBinding` to the platform's native queue service:

| Platform | Queue Service | Notes |
|----------|--------------|-------|
| Cloudflare | Cloudflare Queues | Workers-native, batched delivery |
| AWS | Amazon SQS | Standard and FIFO queues |
| Google Cloud | Cloud Pub/Sub | Topic-based with subscriptions |
| Azure | Azure Service Bus | Queues and topics |
| DigitalOcean | -- | Use built-in jobs instead |
| Docker | BullMQ (Redis) | Self-hosted, Bull Board for monitoring |

Platforms without a native queue service (such as DigitalOcean App Platform) should use the built-in job system for asynchronous work.

## Sending Messages

Inject `QueueService` to send messages from anywhere in your application:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { QueueService } from '@cruzjs/core/queues';

type OrderEvent = {
  type: 'order.placed' | 'order.shipped';
  orderId: string;
  orgId: string;
  timestamp: string;
};

@Injectable()
export class OrderNotificationService {
  constructor(
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {}

  async notifyOrderPlaced(orderId: string, orgId: string) {
    await this.queueService.send<OrderEvent>('ORDER_EVENTS', {
      type: 'order.placed',
      orderId,
      orgId,
      timestamp: new Date().toISOString(),
    });
  }

  async notifyBulkShipment(orders: Array<{ id: string; orgId: string }>) {
    await this.queueService.sendBatch<OrderEvent>(
      'ORDER_EVENTS',
      orders.map((order) => ({
        body: {
          type: 'order.shipped',
          orderId: order.id,
          orgId: order.orgId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
```

Internally, `QueueService` calls `adapter.getQueue<T>(name)` to resolve the platform-specific `QueueBinding`. If the queue is unavailable (for example, during local development without a queue provider), the service logs a warning and returns gracefully without throwing.

### Checking Availability

```typescript
if (this.queueService.isAvailable('ORDER_EVENTS')) {
  await this.queueService.send('ORDER_EVENTS', event);
} else {
  // Fall back to the built-in job system
  await this.jobService.createJob({ type: 'process-order', payload: event });
}
```

This pattern is useful when you want queue-based processing in production but need a working fallback in development or on platforms without queue support.

## Queue Consumers

Consumers are platform-specific. Each platform has its own model for receiving and processing queue messages:

- **Cloudflare** uses standalone Workers with a `queue()` handler that receives message batches.
- **AWS** uses Lambda functions triggered by SQS event source mappings.
- **Google Cloud** uses Cloud Run services or Cloud Functions with Pub/Sub push subscriptions.
- **Azure** uses Azure Functions with Service Bus triggers.
- **Docker** uses BullMQ worker processes connected to Redis.

Because consumer setup depends on platform infrastructure, it is documented in each adapter's dedicated page rather than here.

## Platform-Specific Details

### Cloudflare

Queue consumers run as standalone Workers deployed alongside your main application. Configuration uses `wrangler.toml` bindings for producers and consumers, with built-in support for batching, retries, and dead letter queues. Use `cruz new queue-worker <name> --queue <queue>` to scaffold a consumer.

See [Cloudflare Queues](/cloudflare/queues) for consumer Workers and `wrangler.toml` configuration.

### AWS

SQS queues are configured through the AWS adapter options. Messages are consumed by Lambda functions via event source mappings, giving you automatic scaling and built-in retry with DLQ support.

See [AWS Adapter](/adapters/aws) for SQS configuration and Lambda consumer setup.

### Docker

BullMQ provides Redis-backed queues for self-hosted deployments. Configure the Redis connection through adapter options, and use Bull Board for a web-based monitoring dashboard. BullMQ workers run as separate Node.js processes.

See [Docker Adapter](/adapters/docker) for Redis configuration and BullMQ worker setup.

## Best Practices

1. **Keep messages small.** Send entity IDs and metadata, not full payloads. Let the consumer fetch current data from the database when it processes the message. This avoids stale data and keeps queue throughput high.

2. **Make consumers idempotent.** All queue providers deliver messages at least once. Your consumer must handle duplicate messages safely -- check whether the work has already been done before proceeding.

3. **Monitor dead letter queues.** Every platform supports DLQs for messages that exceed retry limits. Set up alerts on DLQ depth so failed messages do not go unnoticed.

4. **Use typed messages.** Define TypeScript types for your queue messages and pass them as generic parameters to `send<T>()` and `sendBatch<T>()`. Compile-time type safety catches serialization mismatches before they reach production.

5. **Fall back to jobs when queues are unavailable.** Not every environment has a queue provider. Use `isAvailable()` to check at runtime and dispatch to the built-in job system as a fallback.

6. **Separate concerns between producers and consumers.** Your main application should only send messages. Consumer logic belongs in dedicated workers or processes, keeping your application focused on handling requests.
