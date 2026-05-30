---
title: AWS Lambda
description: Deploy CruzJS as a serverless function on AWS Lambda with cold start optimization and the waitUntil flush pattern.
---

AWS Lambda runs your CruzJS app as a serverless function that scales to zero when idle and scales up automatically under load. This page covers Lambda-specific runtime behavior, configuration, and trade-offs compared to Fargate.

## Server Entry Point

Create a `server.ts` that exports a Lambda handler:

```typescript
// server.ts
import { createCruzApp } from '@cruzjs/core';
import { AWSLambdaAdapter } from '@cruzjs/adapter-aws';
import { schema } from './database/schema';

const app = createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AWSLambdaAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    s3Bucket: process.env.S3_BUCKET,
    sqsQueueUrl: process.env.SQS_QUEUE_URL,
  }),
  pages: () => import('virtual:react-router/server-build'),
});

export const handler = app.handler;
```

The `AWSLambdaAdapter` converts API Gateway or Function URL events into standard `Request` objects, runs them through your CruzJS app, and returns the response in the format Lambda expects.

## The waitUntil Flush Pattern

On Cloudflare Workers, `waitUntil()` keeps the isolate alive after the response is sent. Lambda does not have this capability -- the runtime freezes immediately after you return a response. Any pending background work (analytics, logging, cache writes) will be suspended mid-execution.

CruzJS handles this by collecting all `waitUntil()` promises internally. You must flush them **before** returning:

```typescript
// This happens automatically inside the adapter's handler.
// If you write a custom handler, call flushPendingWork() explicitly:

export const handler = async (event, context) => {
  const response = await app.handleRequest(event);

  // Flush all waitUntil() promises before Lambda freezes
  await app.adapter.flushPendingWork();

  return response;
};
```

The built-in `app.handler` does this automatically. You only need to call `flushPendingWork()` if you build a custom handler wrapper.

## Cold Starts

Lambda cold starts happen when AWS provisions a new execution environment. Typical cold start times for a CruzJS app:

| Configuration | Cold Start |
|---------------|-----------|
| 512 MB, no VPC | 100-300ms |
| 512 MB, with VPC (ElastiCache/RDS) | 1-3s |
| 1024 MB, with VPC | 800ms-2s |

### Reducing Cold Starts

**Increase memory.** Lambda allocates CPU proportionally to memory. At 1769 MB you get a full vCPU, which speeds up module initialization significantly.

**Use provisioned concurrency** for production workloads that need consistent latency:

```typescript
// CDK
const fn = new lambda.Function(this, 'CruzApp', { /* ... */ });
const alias = fn.addAlias('live');
alias.addAutoScaling({
  minCapacity: 2,
  maxCapacity: 50,
});
```

**Minimize bundle size.** Lambda has a 50 MB zipped / 250 MB unzipped deployment limit. Use tree-shaking and avoid importing large SDKs you don't need.

### Lambda Layers

If your bundle approaches the size limit, move `node_modules` into a Lambda Layer:

```bash
mkdir -p layer/nodejs
cp -r node_modules layer/nodejs/
cd layer && zip -r ../layer.zip .
```

```typescript
const depsLayer = new lambda.LayerVersion(this, 'DepsLayer', {
  code: lambda.Code.fromAsset('./layer.zip'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
});

const fn = new lambda.Function(this, 'CruzApp', {
  layers: [depsLayer],
  // ...
});
```

## Function URL vs API Gateway

Lambda supports two ways to receive HTTP traffic:

| | Function URL | API Gateway (HTTP API) |
|---|---|---|
| Cost | Free (pay only for Lambda) | $1/million requests + Lambda |
| Custom domain | Via CloudFront | Built-in |
| Auth | IAM or none | IAM, JWT, Lambda authorizers |
| WebSocket | No | Yes (WebSocket API) |
| Rate limiting | No | Built-in throttling |

For most CruzJS apps, **API Gateway HTTP API** is recommended because it provides custom domain support and request throttling out of the box. Use Function URLs for internal services or when minimizing cost.

## Memory and Timeout Configuration

Recommended settings for CruzJS on Lambda:

```typescript
const fn = new lambda.Function(this, 'CruzApp', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'server.handler',
  code: lambda.Code.fromAsset('./build'),
  memorySize: 1024,    // 1 GB -- good balance of cost and speed
  timeout: cdk.Duration.seconds(30),
  environment: {
    DATABASE_URL: '...',
    AUTH_SECRET: '...',
    NODE_ENV: 'production',
  },
});
```

- **Memory**: Start at 1024 MB. Go to 512 MB for cost savings on low-traffic apps, or 2048 MB for CPU-intensive workloads.
- **Timeout**: 30 seconds is a safe default. API Gateway has a hard 29-second limit, so set Lambda timeout slightly higher to avoid silent kills.

## Environment Variables

Set environment variables directly on the function or pull from Secrets Manager at startup:

```typescript
const fn = new lambda.Function(this, 'CruzApp', {
  environment: {
    DATABASE_URL: db.instanceEndpoint.socketAddress,
    REDIS_URL: cache.cluster.attrRedisEndpointAddress,
    S3_BUCKET: bucket.bucketName,
    SQS_QUEUE_URL: queue.queueUrl,
    AUTH_SECRET: secretValue,
    NODE_ENV: 'production',
  },
});
```

For secrets that should not appear in CloudFormation templates, use SSM Parameter Store or Secrets Manager and resolve them at deploy time. See the [Deploying to AWS](/adapters/aws-deploy) guide.

## When to Use Lambda vs Fargate

Choose **Lambda** when:
- Traffic is bursty or unpredictable
- You want scale-to-zero billing
- Request durations are under 30 seconds
- You don't need WebSockets or persistent connections

Choose **Fargate** when:
- Traffic is steady and high-volume
- You need connection pooling (pg.Pool)
- You want WebSocket support
- You need requests longer than 30 seconds
- Background work is heavy and ongoing

See the [AWS Fargate](/adapters/aws-fargate) page for the container runtime alternative.
