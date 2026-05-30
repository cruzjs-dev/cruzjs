---
title: Deploying to AWS
description: Deploy CruzJS to AWS with CDK, SAM, or GitHub Actions including database migrations, secrets, and rollbacks.
---

This guide covers the full deployment workflow for CruzJS on AWS, from infrastructure provisioning to CI/CD automation.

## CDK Stack (Recommended)

AWS CDK is the recommended approach. A complete stack for Lambda with all supporting services:

```typescript
// infra/lib/cruz-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class CruzStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'CruzVpc', { maxAzs: 2 });

    // Database
    const db = new rds.DatabaseInstance(this, 'CruzDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      databaseName: 'cruzdb',
      credentials: rds.Credentials.fromGeneratedSecret('cruzuser'),
    });

    // RDS Proxy for Lambda connection pooling
    const proxy = new rds.DatabaseProxy(this, 'CruzSaasxy', {
      proxyTarget: rds.ProxyTarget.fromInstance(db),
      secrets: [db.secret!],
      vpc,
      requireTLS: true,
    });

    // S3 bucket
    const bucket = new s3.Bucket(this, 'CruzUploads', {
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // SQS queue with DLQ
    const dlq = new sqs.Queue(this, 'CruzDLQ', {
      retentionPeriod: cdk.Duration.days(14),
    });
    const queue = new sqs.Queue(this, 'CruzQueue', {
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    });

    // Auth secret
    const authSecret = new secretsmanager.Secret(this, 'AuthSecret', {
      generateSecretString: { excludePunctuation: true, passwordLength: 64 },
    });

    // Lambda function
    const fn = new lambda.Function(this, 'CruzApp', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'server.handler',
      code: lambda.Code.fromAsset('./build'),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      vpc,
      environment: {
        DATABASE_URL: `postgresql://cruzuser@${proxy.endpoint}:5432/cruzdb`,
        S3_BUCKET: bucket.bucketName,
        SQS_QUEUE_URL: queue.queueUrl,
        AUTH_SECRET: authSecret.secretValue.unsafeUnwrap(),
        NODE_ENV: 'production',
      },
    });

    // Permissions
    bucket.grantReadWrite(fn);
    queue.grantSendMessages(fn);
    proxy.grantConnect(fn, 'cruzuser');

    // Function URL (or use API Gateway)
    fn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });
  }
}
```

Deploy:

```bash
cruz build
cd infra && npx cdk deploy
```

## SAM (Alternative)

For teams that prefer CloudFormation-based tooling:

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    MemorySize: 1024

Parameters:
  DatabaseUrl:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /cruz/DATABASE_URL
  AuthSecret:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /cruz/AUTH_SECRET

Resources:
  CruzFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: server.handler
      CodeUri: ./build/
      Environment:
        Variables:
          DATABASE_URL: !Ref DatabaseUrl
          AUTH_SECRET: !Ref AuthSecret
          S3_BUCKET: !Ref UploadsBucket
          SQS_QUEUE_URL: !Ref CruzQueue
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY

  UploadsBucket:
    Type: AWS::S3::Bucket

  CruzQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 60
```

Deploy:

```bash
cruz build
sam deploy --guided
```

## GitHub Actions CI/CD

A complete workflow that builds, migrates, and deploys on every push to `main`:

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build
        run: npx cruz build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Run database migrations
        run: |
          npx cruz db migrate --connection-string "${{ secrets.DATABASE_URL }}"

      - name: Deploy with CDK
        working-directory: infra
        run: npx cdk deploy --require-approval never
```

### OIDC Authentication

The workflow above uses OIDC (`role-to-assume`) instead of long-lived access keys. Set up the IAM identity provider for GitHub Actions:

```typescript
// CDK -- in a separate bootstrap stack
const provider = new iam.OpenIdConnectProvider(this, 'GitHub', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
});

const deployRole = new iam.Role(this, 'DeployRole', {
  assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
    StringEquals: {
      'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    },
    StringLike: {
      'token.actions.githubusercontent.com:sub': 'repo:your-org/your-repo:ref:refs/heads/main',
    },
  }),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
  ],
});
```

## Database Migrations

### Lambda: Invoke a Migration Function

Create a dedicated Lambda that runs migrations, invoked during deploy:

```typescript
// infra/lib/cruz-stack.ts
const migrator = new lambda.Function(this, 'Migrator', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'migrate.handler',
  code: lambda.Code.fromAsset('./build'),
  vpc,
  timeout: cdk.Duration.minutes(5),
  environment: {
    DATABASE_URL: `postgresql://cruzuser@${proxy.endpoint}:5432/cruzdb`,
  },
});
proxy.grantConnect(migrator, 'cruzuser');
```

Invoke it from CI:

```bash
aws lambda invoke --function-name CruzStack-Migrator --payload '{}' /dev/null
```

### Fargate: One-Off ECS Task

Run migrations as a one-off ECS task before deploying the new version:

```bash
aws ecs run-task \
  --cluster cruz-cluster \
  --task-definition cruz-migrator \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides":[{"name":"migrator","command":["node","build/migrate.js"]}]}'
```

## Secrets Management

### SSM Parameter Store

For non-sensitive configuration:

```bash
aws ssm put-parameter --name /cruz/prod/S3_BUCKET --value my-cruz-uploads --type String
aws ssm put-parameter --name /cruz/prod/SQS_QUEUE_URL --value https://sqs... --type String
```

### Secrets Manager

For sensitive values (database passwords, API keys):

```bash
aws secretsmanager create-secret --name cruz/prod/DATABASE_URL \
  --secret-string "postgresql://cruzuser:password@proxy.xxxx.rds.amazonaws.com:5432/cruzdb"

aws secretsmanager create-secret --name cruz/prod/AUTH_SECRET \
  --secret-string "$(openssl rand -base64 48)"
```

Reference in CDK:

```typescript
const dbUrl = secretsmanager.Secret.fromSecretNameV2(this, 'DbUrl', 'cruz/prod/DATABASE_URL');
fn.addEnvironment('DATABASE_URL', dbUrl.secretValue.unsafeUnwrap());
```

## Rolling Back a Deploy

### Lambda

Lambda keeps previous versions. Roll back by updating the alias to point to the prior version:

```bash
# List recent versions
aws lambda list-versions-by-function --function-name CruzApp --max-items 5

# Point the alias back to the previous version
aws lambda update-alias --function-name CruzApp --name live --function-version 42
```

### Fargate with CodeDeploy

If you use blue/green deployments, CodeDeploy supports automatic rollback on health check failure. To roll back manually:

```bash
aws deploy stop-deployment --deployment-id d-XXXXXXXXX --auto-rollback-enabled
```

### CDK Rollback

If the CDK deployment itself fails (CloudFormation stack update), it rolls back automatically. To manually roll back to the last successful deploy:

```bash
# Revert your code change, rebuild, and redeploy
git revert HEAD
cruz build
cd infra && npx cdk deploy
```

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (use RDS Proxy endpoint for Lambda) |
| `AUTH_SECRET` | Yes | Session encryption key (64+ characters) |
| `REDIS_URL` | No | ElastiCache Redis endpoint (`rediss://` for TLS) |
| `S3_BUCKET` | No | S3 bucket name for file storage |
| `S3_REGION` | No | AWS region for S3 (defaults to function region) |
| `SQS_QUEUE_URL` | No | SQS queue URL for background jobs |
| `OPENAI_API_KEY` | No | OpenAI API key (or use Bedrock) |
| `AWS_BEDROCK_REGION` | No | Region for Bedrock AI inference |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Fargate only | HTTP listen port (default 3000) |
