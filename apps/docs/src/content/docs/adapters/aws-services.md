---
title: AWS Services
description: Configure RDS, ElastiCache, S3, and SQS for your CruzJS application on AWS.
---

CruzJS maps its provider-agnostic bindings to AWS services automatically. This page covers setup and configuration for each service.

## RDS (Database)

CruzJS uses Drizzle ORM, which supports PostgreSQL and MySQL on AWS via RDS or Aurora.

### PostgreSQL on RDS

Create an RDS instance and set the connection string:

```bash
DATABASE_URL=postgresql://cruzuser:password@mydb.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/cruzdb
```

### Aurora Serverless v2

For auto-scaling PostgreSQL that scales down to near-zero during idle periods:

```bash
DATABASE_URL=postgresql://cruzuser:password@mydb-cluster.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/cruzdb
```

```typescript
// CDK
const cluster = new rds.DatabaseCluster(this, 'CruzDB', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_16_1,
  }),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 8,
  writer: rds.ClusterInstance.serverlessV2('writer'),
  vpc,
  defaultDatabaseName: 'cruzdb',
});
```

### RDS Proxy (Required for Lambda)

Lambda functions open a new database connection per invocation, which can exhaust the connection limit. RDS Proxy sits between Lambda and RDS to pool connections:

```bash
DATABASE_URL=postgresql://cruzuser:password@mydb-proxy.proxy-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/cruzdb
```

```typescript
// CDK
const proxy = new rds.DatabaseProxy(this, 'CruzSaasxy', {
  proxyTarget: rds.ProxyTarget.fromInstance(dbInstance),
  secrets: [dbInstance.secret!],
  vpc,
  requireTLS: true,
});

// Grant Lambda access
proxy.grantConnect(lambdaFn, 'cruzuser');
```

RDS Proxy is **not required** for Fargate since the long-running process manages its own connection pool via `pg.Pool`.

### IAM Database Authentication

Instead of storing database passwords, you can use IAM roles to authenticate:

```typescript
const proxy = new rds.DatabaseProxy(this, 'CruzSaasxy', {
  proxyTarget: rds.ProxyTarget.fromInstance(dbInstance),
  secrets: [dbInstance.secret!],
  vpc,
  iamAuth: true,
});
```

The adapter generates short-lived auth tokens automatically when `iamAuth` is enabled in the adapter config.

## ElastiCache (Cache)

ElastiCache Redis maps to CruzJS's `CacheBinding` interface for session storage, query caching, and rate limiting.

### Setup

```typescript
new AWSLambdaAdapter({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
});
```

```bash
REDIS_URL=rediss://my-cluster.xxxxxxxxxxxx.use1.cache.amazonaws.com:6379
```

Note the `rediss://` scheme (with double s) for TLS connections, which ElastiCache requires by default.

### CDK Configuration

```typescript
const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnets', {
  description: 'Subnets for CruzJS cache',
  subnetIds: vpc.privateSubnets.map(s => s.subnetId),
});

const cacheCluster = new elasticache.CfnReplicationGroup(this, 'CruzCache', {
  replicationGroupDescription: 'CruzJS Redis cache',
  engine: 'redis',
  cacheNodeType: 'cache.t4g.micro',
  numCacheClusters: 2,
  automaticFailoverEnabled: true,
  transitEncryptionEnabled: true,
  cacheSubnetGroupName: cacheSubnetGroup.ref,
  securityGroupIds: [cacheSecurityGroup.securityGroupId],
});
```

### VPC Requirements

ElastiCache runs inside your VPC. Both Lambda and Fargate must be in the same VPC with a security group that allows outbound traffic to the cache port (6379).

For Lambda, VPC access adds a cold start penalty of 1-2 seconds on the first invocation after a scale-from-zero event. Subsequent warm invocations are unaffected.

### Security Group Configuration

```typescript
const cacheSG = new ec2.SecurityGroup(this, 'CacheSG', { vpc });

// Allow Lambda/Fargate to connect
cacheSG.addIngressRule(
  appSecurityGroup,
  ec2.Port.tcp(6379),
  'Allow Redis access from app'
);
```

## S3 (Storage)

S3 maps to CruzJS's storage binding for file uploads, media, and static assets.

### Setup

```typescript
new AWSLambdaAdapter({
  databaseUrl: process.env.DATABASE_URL,
  s3Bucket: process.env.S3_BUCKET,
  s3Region: process.env.S3_REGION,
});
```

```bash
S3_BUCKET=my-cruz-uploads
S3_REGION=us-east-1
```

### IAM Policy

Grant your Lambda function or Fargate task the minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-cruz-uploads",
        "arn:aws:s3:::my-cruz-uploads/*"
      ]
    }
  ]
}
```

With CDK, use the grant helpers instead:

```typescript
bucket.grantReadWrite(lambdaFn);
```

### Presigned URLs for Direct Client Uploads

Avoid routing large files through your Lambda function. Generate presigned URLs and let clients upload directly to S3:

```typescript
const storageService = container.resolve(StorageService);

const uploadUrl = await storageService.getPresignedUploadUrl('uploads/photo.jpg', {
  expiresIn: 3600,
  contentType: 'image/jpeg',
  maxSize: 10 * 1024 * 1024, // 10 MB
});

// Return uploadUrl to the client for a direct PUT request
```

### CORS Configuration

Enable CORS on the bucket so browsers can upload directly:

```typescript
const bucket = new s3.Bucket(this, 'CruzUploads', {
  cors: [{
    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
    allowedOrigins: ['https://your-app.com'],
    allowedHeaders: ['*'],
    maxAge: 3600,
  }],
});
```

### CloudFront CDN for Public Assets

Serve uploaded files through CloudFront for global caching and HTTPS:

```typescript
const distribution = new cloudfront.Distribution(this, 'CruzCDN', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
});
```

Use the CloudFront URL (`https://d111111abcdef8.cloudfront.net/uploads/photo.jpg`) in your app instead of the S3 URL.

## SQS (Queues)

SQS maps to CruzJS's `QueueBinding` interface for background job processing.

### Setup

```typescript
new AWSLambdaAdapter({
  databaseUrl: process.env.DATABASE_URL,
  sqsQueueUrl: process.env.SQS_QUEUE_URL,
});
```

```bash
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/my-cruz-queue
```

### Queue Consumer with Lambda

SQS messages trigger a Lambda function via an event source mapping. Create a consumer in `external-processes/`:

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

```typescript
// CDK -- wire the consumer to the queue
const consumer = new lambda.Function(this, 'QueueConsumer', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('./external-processes/queue-consumer/build'),
  timeout: cdk.Duration.seconds(60),
});

consumer.addEventSource(new lambdaEvents.SqsEventSource(queue, {
  batchSize: 10,
  maxBatchingWindow: cdk.Duration.seconds(5),
}));
```

### Dead Letter Queue

Failed messages are sent to a DLQ after a configurable number of retries:

```typescript
const dlq = new sqs.Queue(this, 'CruzDLQ', {
  retentionPeriod: cdk.Duration.days(14),
});

const queue = new sqs.Queue(this, 'CruzQueue', {
  visibilityTimeout: cdk.Duration.seconds(60),
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3,
  },
});
```

Set `visibilityTimeout` to at least 6x your consumer's timeout to prevent messages from being retried while still processing.

### Batch Processing

For high-throughput queues, process messages in batches and report individual failures:

```typescript
import type { SQSBatchResponse, SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      await processMessage(JSON.parse(record.body));
    } catch {
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
```

Enable partial batch failure reporting in your event source mapping:

```typescript
consumer.addEventSource(new lambdaEvents.SqsEventSource(queue, {
  batchSize: 10,
  reportBatchItemFailures: true,
}));
```

This ensures only failed messages are retried, not the entire batch.
