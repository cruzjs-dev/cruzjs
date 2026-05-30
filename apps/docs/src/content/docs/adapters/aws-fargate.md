---
title: AWS Fargate
description: Deploy CruzJS as a long-running container on AWS ECS Fargate with connection pooling and persistent connections.
---

AWS Fargate runs your CruzJS app as a long-running container managed by ECS. Unlike Lambda, the process stays alive between requests, which enables connection pooling, WebSockets, and fire-and-forget background work.

## Server Entry Point

```typescript
// server.ts
import { createCruzApp } from '@cruzjs/core';
import { AWSFargateAdapter } from '@cruzjs/adapter-aws';
import { schema } from './database/schema';

const app = createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AWSFargateAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    s3Bucket: process.env.S3_BUCKET,
    sqsQueueUrl: process.env.SQS_QUEUE_URL,
    port: Number(process.env.PORT) || 3000,
  }),
  pages: () => import('virtual:react-router/server-build'),
});

app.listen();
```

The `AWSFargateAdapter` starts an HTTP server (based on Node's built-in `http` module) and listens on the configured port.

## Connection Pooling

Because Fargate runs a persistent process, you get real connection pooling with PostgreSQL. The adapter configures `pg.Pool` automatically:

```typescript
new AWSFargateAdapter({
  databaseUrl: process.env.DATABASE_URL,
  poolConfig: {
    min: 2,
    max: 20,
    idleTimeoutMillis: 30000,
  },
});
```

This is a significant advantage over Lambda, where each invocation may create a new database connection. With Fargate, you do **not** need RDS Proxy (though you can still use it for additional connection management).

## Background Work with waitUntil

On Fargate, `waitUntil()` is truly fire-and-forget. The process continues running after the response is sent, so background promises execute without blocking:

```typescript
// In a service or route handler
ctx.waitUntil(analytics.trackEvent('page_view', { userId }));
ctx.waitUntil(cache.warm('dashboard', userId));

// These run after the response is returned to the client.
// No flush needed -- the process stays alive.
```

This makes Fargate ideal for apps with heavy background processing requirements.

## Dockerfile

```dockerfile
FROM node:20-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx cruz build

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build/server.js"]
```

Build and push to ECR:

```bash
cruz build
docker build -t cruz-app .
docker tag cruz-app:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/cruz-app:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/cruz-app:latest
```

## ECS Task Definition

```json
{
  "family": "cruz-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/cruzAppTaskRole",
  "containerDefinitions": [
    {
      "name": "cruz-app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/cruz-app:latest",
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:cruz/DATABASE_URL"
        },
        {
          "name": "AUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:cruz/AUTH_SECRET"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cruz-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Health Check Endpoint

CruzJS exposes a `/api/health` endpoint automatically. Configure the ALB target group to use it:

```typescript
// CDK
const targetGroup = new elbv2.ApplicationTargetGroup(this, 'CruzTG', {
  vpc,
  port: 3000,
  protocol: elbv2.ApplicationProtocol.HTTP,
  targets: [service],
  healthCheck: {
    path: '/api/health',
    interval: cdk.Duration.seconds(15),
    healthyThresholdCount: 2,
    unhealthyThresholdCount: 3,
  },
});
```

## Auto-Scaling

Configure ECS service auto-scaling based on CPU or request count:

```typescript
const scaling = service.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 20,
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(30),
});

scaling.scaleOnRequestCount('RequestScaling', {
  requestsPerTarget: 1000,
  targetGroup,
});
```

## Blue/Green Deployments

Use CodeDeploy with ECS for zero-downtime deployments:

```typescript
const deploymentGroup = new codedeploy.EcsDeploymentGroup(this, 'CruzDG', {
  service,
  blueGreenDeploymentConfig: {
    blueTargetGroup,
    greenTargetGroup,
    listener,
  },
  deploymentConfig: codedeploy.EcsDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTES,
  autoRollback: {
    failedDeployment: true,
    stoppedDeployment: true,
  },
});
```

This shifts traffic gradually from the old version to the new one and automatically rolls back if the health check fails.

## ALB Setup

An Application Load Balancer sits in front of your Fargate service:

```typescript
const alb = new elbv2.ApplicationLoadBalancer(this, 'CruzALB', {
  vpc,
  internetFacing: true,
});

const listener = alb.addListener('HttpsListener', {
  port: 443,
  certificates: [certificate],
});

listener.addTargetGroups('CruzTargets', {
  targetGroups: [targetGroup],
});

// Redirect HTTP to HTTPS
alb.addRedirect({ sourcePort: 80, targetPort: 443 });
```

## Environment Variables via Secrets Manager

Fargate tasks pull secrets directly from AWS Secrets Manager at startup. This keeps sensitive values out of your task definition and CloudFormation templates:

```bash
# Create secrets
aws secretsmanager create-secret --name cruz/DATABASE_URL --secret-string "postgresql://..."
aws secretsmanager create-secret --name cruz/AUTH_SECRET --secret-string "your-secret-key"
```

Reference them in the task definition's `secrets` array (shown above). The ECS agent injects them as environment variables when the container starts.

## When to Use Fargate vs Lambda

Choose **Fargate** when:
- Traffic is steady and predictable
- You need persistent database connections (pg.Pool)
- Background processing is heavy
- You want WebSocket support
- Requests may exceed 30 seconds

Choose **Lambda** when:
- Traffic is bursty with idle periods
- You want pay-per-request billing
- Cold start latency is acceptable
- You prefer zero infrastructure management

See the [AWS Lambda](/adapters/aws-lambda) page for the serverless alternative.
