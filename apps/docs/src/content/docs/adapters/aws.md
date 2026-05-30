---
title: AWS Adapter
description: Deploy CruzJS on AWS Lambda or ECS Fargate with RDS, ElastiCache, S3, and SQS.
---

The AWS adapter supports two deployment modes: **Lambda** (serverless) and **Fargate** (container).

## Installation

```bash
npm install @cruzjs/adapter-aws
```

## Lambda Mode

Best for: Serverless APIs, low-traffic apps, pay-per-request billing.

```typescript
import { AWSLambdaAdapter } from '@cruzjs/adapter-aws';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AWSLambdaAdapter({
    databaseUrl: process.env.DATABASE_URL,
    s3Bucket: process.env.S3_BUCKET,
    openaiApiKey: process.env.OPENAI_API_KEY,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

### Key Considerations
- **Cold starts**: 100-500ms. Use provisioned concurrency for production.
- **Database**: Use RDS Proxy to avoid connection exhaustion.
- **Background work**: `waitUntil()` collects promises. Call `adapter.flushPendingWork()` before returning.
- **Bundle size**: Lambda has a 50MB zip limit.

## Fargate Mode

Best for: High-traffic apps, persistent connections, WebSocket support.

```typescript
import { AWSFargateAdapter } from '@cruzjs/adapter-aws';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new AWSFargateAdapter({
    databaseUrl: process.env.DATABASE_URL,
    s3Bucket: process.env.S3_BUCKET,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

### Key Considerations
- **Connection pooling**: Long-lived process supports `pg.Pool`.
- **Background work**: `waitUntil()` is fire-and-forget.
- **Auto-scaling**: ECS service auto-scaling based on CPU/memory.

## Service Mapping

| CruzJS Binding | AWS Service |
|----------------|------------|
| Database | RDS (Postgres/MySQL), Aurora Serverless |
| Cache | ElastiCache (Redis), DynamoDB |
| Storage | S3 |
| Queue | SQS |
| AI | Bedrock, OpenAI API |

## Database Setup (RDS)

CruzJS uses Drizzle ORM which supports PostgreSQL and MySQL in addition to SQLite. When deploying to AWS, you typically use RDS or Aurora.

### RDS PostgreSQL

Create an RDS PostgreSQL instance and set the connection string:

```bash
DATABASE_URL=postgresql://cruzuser:password@mydb.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/cruzdb
```

### Aurora Serverless v2

For serverless scaling with PostgreSQL compatibility:

```bash
DATABASE_URL=postgresql://cruzuser:password@mydb-cluster.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/cruzdb
```

### RDS Proxy (Required for Lambda)

Lambda functions can exhaust database connections because each invocation opens a new connection. RDS Proxy pools connections for you:

```bash
# Use the RDS Proxy endpoint instead of the direct RDS endpoint
DATABASE_URL=postgresql://cruzuser:password@mydb-proxy.proxy-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/cruzdb
```

Create an RDS Proxy via the AWS Console or CDK:

```typescript
// CDK example
const proxy = new rds.DatabaseProxy(this, 'CruzSaasxy', {
  proxyTarget: rds.ProxyTarget.fromInstance(dbInstance),
  secrets: [dbInstance.secret!],
  vpc,
  requireTLS: true,
});
```

## Cache Setup (ElastiCache Redis)

ElastiCache Redis maps to CruzJS's `CacheBinding` interface.

### Configuration

```typescript
new AWSLambdaAdapter({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  // ...
})
```

```bash
REDIS_URL=redis://my-cluster.xxxxxxxxxxxx.use1.cache.amazonaws.com:6379
```

### VPC Requirements

ElastiCache runs inside a VPC. Your Lambda function or Fargate task must be in the same VPC with a security group that allows access to the ElastiCache port (6379).

For Lambda, this means configuring VPC access in your function configuration, which adds a small cold start penalty (1-2 seconds for the first invocation after a scale-from-zero event).

## Storage Setup (S3)

S3 maps to CruzJS's storage binding for file uploads and media.

### Configuration

```typescript
new AWSLambdaAdapter({
  databaseUrl: process.env.DATABASE_URL,
  s3Bucket: process.env.S3_BUCKET,
  s3Region: process.env.S3_REGION,
  // ...
})
```

```bash
S3_BUCKET=my-cruz-uploads
S3_REGION=us-east-1
```

### Bucket Policy

For production, configure your S3 bucket with appropriate permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-cruz-uploads/*"
    }
  ]
}
```

### Pre-signed URLs

The adapter supports pre-signed URL generation for direct client uploads, avoiding routing large files through your Lambda function:

```typescript
const storageService = container.resolve(StorageService);
const uploadUrl = await storageService.getPresignedUploadUrl('uploads/photo.jpg', {
  expiresIn: 3600,
  contentType: 'image/jpeg',
});
```

## Queue Setup (SQS)

SQS maps to CruzJS's `QueueBinding` interface for background job processing.

### Configuration

```typescript
new AWSLambdaAdapter({
  databaseUrl: process.env.DATABASE_URL,
  sqsQueueUrl: process.env.SQS_QUEUE_URL,
  // ...
})
```

```bash
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/my-cruz-queue
```

### SQS Consumer

Unlike Cloudflare Queues (which use a separate Worker), SQS messages are consumed by a Lambda function triggered by the SQS event source mapping:

```typescript
// external-processes/queue-consumer/src/index.ts
import type { SQSHandler, SQSEvent } from 'aws-lambda';

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    await processMessage(message);
  }
};
```

### Dead Letter Queue

Configure a DLQ for messages that fail processing:

```bash
SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789012/my-cruz-queue-dlq
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL or MySQL connection string |
| `REDIS_URL` | No | ElastiCache Redis endpoint |
| `S3_BUCKET` | No | S3 bucket name for file storage |
| `S3_REGION` | No | AWS region for S3 (defaults to function region) |
| `SQS_QUEUE_URL` | No | SQS queue URL for background jobs |
| `OPENAI_API_KEY` | No | OpenAI API key (or use Bedrock) |
| `AWS_BEDROCK_REGION` | No | Region for Bedrock AI inference |
| `AUTH_SECRET` | Yes | Session encryption key |

## Deployment with CDK

Use AWS CDK for infrastructure as code:

```typescript
// infra/lib/cruz-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CruzStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Database
    const db = new rds.DatabaseInstance(this, 'CruzDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
    });

    // S3 bucket
    const bucket = new s3.Bucket(this, 'CruzUploads', {
      bucketName: 'my-cruz-uploads',
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    // SQS queue
    const queue = new sqs.Queue(this, 'CruzQueue', {
      queueName: 'my-cruz-queue',
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'CruzDLQ'),
        maxReceiveCount: 3,
      },
    });

    // Lambda function
    const fn = new lambda.Function(this, 'CruzApp', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'server.handler',
      code: lambda.Code.fromAsset('./build'),
      environment: {
        DATABASE_URL: db.instanceEndpoint.socketAddress,
        S3_BUCKET: bucket.bucketName,
        SQS_QUEUE_URL: queue.queueUrl,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    bucket.grantReadWrite(fn);
    queue.grantSendMessages(fn);
  }
}
```

### Deploying

```bash
# Build the CruzJS app
cruz build

# Deploy infrastructure and app
cd infra
npx cdk deploy
```

## Deployment with SAM

For teams that prefer AWS SAM:

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    MemorySize: 512

Resources:
  CruzFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: server.handler
      CodeUri: ./build/
      Environment:
        Variables:
          DATABASE_URL: !Sub "postgresql://..."
          S3_BUCKET: !Ref UploadsBucket
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY

  UploadsBucket:
    Type: AWS::S3::Bucket
```

```bash
# Build and deploy
cruz build
sam deploy --guided
```

## Runtime Type

- **Lambda**: `serverless` -- Scale-to-zero functions. `waitUntil()` must be flushed before response returns.
- **Fargate**: `container` -- Long-running process. `waitUntil()` is fire-and-forget.
