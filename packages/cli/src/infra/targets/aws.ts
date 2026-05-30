/**
 * AWS target adapter.
 *
 * IaC is imperative (AWS CDK in TypeScript). The adapter emits a generated
 * `stack.ts` scaffold: a Stack subclass with one L2 construct per binding.
 * Because CDK is imperative, the rung-4 raw escape hatch differs from
 * declarative targets:
 *   - object raw  -> merged as extra construct props (spread into the props arg)
 *   - function raw -> cannot be serialized into generated source; warned. Apply
 *                     it after `cruz eject aws`, where you own the stack.
 */

import type { CapabilityManifest } from '../manifest';
import type { ResolvedBinding } from '../resolver';
import {
  bindingVar,
  connectionSecret,
  resourceName,
  type GenContext,
  type GeneratedArtifact,
  type TargetAdapter,
} from '../adapter';

export const awsManifest: CapabilityManifest = {
  target: 'aws',
  capabilities: {
    sql: {
      native: { postgres: 'aurora-serverless-v2', mysql: 'aurora-serverless-v2' },
      services: ['rds', 'aurora-serverless-v2', 'aurora'],
      scaleToZero: ['aurora-serverless-v2'],
    },
    kv: { native: { '*': 'elasticache' }, services: ['elasticache', 'memorydb'] },
    blob: { native: { '*': 's3' } },
    queue: { native: { work: 'sqs', fanout: 'sns' }, services: ['sqs', 'sns'] },
    vector: { native: { '*': 'opensearch' }, services: ['opensearch'], fallback: 'opensearch' },
    search: { native: { '*': 'opensearch' } },
    llm: { native: { '*': 'bedrock' } },
    email: { native: { '*': 'ses' } },
    cron: { native: { '*': 'eventbridge-scheduler' } },
    realtime: { native: { '*': 'apigw-websocket' } },
  },
  iac: { format: 'cdk', emit: 'stack.ts' },
};

function propsLiteral(props: Record<string, unknown>, raw: unknown): string {
  const merged = { ...props };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) Object.assign(merged, raw);
  const body = Object.entries(merged)
    .map(([k, v]) => `    ${k}: ${typeof v === 'string' && v.startsWith('cdk:') ? v.slice(4) : JSON.stringify(v)}`)
    .join(',\n');
  return `{\n${body},\n  }`;
}

function generate(resolved: ResolvedBinding[], ctx: GenContext): GeneratedArtifact {
  const id = (s: string) => bindingVar(s).replace(/_/g, '');
  const lines: string[] = [];
  const secrets: string[] = [];
  const warnings: string[] = [];
  const imports = new Set<string>(['Stack', 'StackProps']);
  const body: string[] = [];

  const needVpc = resolved.some((b) =>
    b.sourcing === 'native' && ['sql', 'kv', 'vector', 'search'].includes(b.type)
  );
  if (needVpc) body.push(`    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });`);

  for (const b of resolved) {
    if (b.sourcing === 'saas' || b.sourcing === 'external') {
      const secret = b.external?.ref?.replace(/^env:/, '') ?? connectionSecret(b.name);
      secrets.push(secret);
      warnings.push(`${b.type} "${b.name}": ${b.sourcing} — via Secrets Manager ${secret}; no CDK construct.`);
      continue;
    }
    if (typeof b.raw === 'function') {
      warnings.push(`${b.type} "${b.name}": function raw cannot be inlined into generated CDK; apply after 'cruz eject aws'.`);
    }
    const cid = id(b.name);
    const rname = resourceName(ctx.app, ctx.env, b.name);
    switch (b.type) {
      case 'sql':
        imports.add('aws_rds as rds').add('aws_ec2 as ec2');
        body.push(
          `    const ${cid} = new rds.DatabaseCluster(this, '${cid}', ${propsLiteral(
            {
              engine: 'cdk:rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_16_4 })',
              serverlessV2MinCapacity: b.options.scale && (b.options.scale as { min?: number }).min === 0 ? 0 : 0.5,
              serverlessV2MaxCapacity: (b.options.scale as { max?: number })?.max ?? 8,
              writer: 'cdk:rds.ClusterInstance.serverlessV2("writer")',
              vpc: 'cdk:vpc',
              defaultDatabaseName: 'cruz',
            },
            b.raw
          )});`
        );
        break;
      case 'kv':
        imports.add('aws_elasticache as elasticache').add('aws_ec2 as ec2');
        body.push(`    // ElastiCache for "${b.name}" — see generated subnet group; tune node type as needed`);
        body.push(
          `    const ${cid} = new elasticache.CfnCacheCluster(this, '${cid}', ${propsLiteral(
            { engine: 'redis', cacheNodeType: 'cache.t4g.micro', numCacheNodes: 1 },
            b.raw
          )});`
        );
        break;
      case 'blob':
        imports.add('aws_s3 as s3');
        body.push(
          `    const ${cid} = new s3.Bucket(this, '${cid}', ${propsLiteral(
            { bucketName: rname, versioned: false },
            b.raw
          )});`
        );
        break;
      case 'queue':
        if (b.service === 'sns') {
          imports.add('aws_sns as sns');
          body.push(`    const ${cid} = new sns.Topic(this, '${cid}', ${propsLiteral({ topicName: rname }, b.raw)});`);
        } else {
          imports.add('aws_sqs as sqs');
          body.push(`    const ${cid} = new sqs.Queue(this, '${cid}', ${propsLiteral({ queueName: rname }, b.raw)});`);
        }
        break;
      case 'vector':
      case 'search':
        imports.add('aws_opensearchservice as opensearch').add('aws_ec2 as ec2');
        body.push(
          `    const ${cid} = new opensearch.Domain(this, '${cid}', ${propsLiteral(
            { version: 'cdk:opensearch.EngineVersion.OPENSEARCH_2_11', vpc: 'cdk:vpc' },
            b.raw
          )});`
        );
        break;
      case 'cron': {
        const schedules = Array.isArray(b.options.schedule) ? b.options.schedule : b.options.schedule ? [b.options.schedule] : [];
        imports.add('aws_scheduler as scheduler');
        for (const [i, s] of (schedules as string[]).entries()) {
          body.push(`    new scheduler.CfnSchedule(this, '${cid}${i}', { scheduleExpression: 'cron(${s})', flexibleTimeWindow: { mode: 'OFF' }, target: { arn: '<HANDLER_ARN>', roleArn: '<ROLE_ARN>' } });`);
        }
        warnings.push(`cron "${b.name}": EventBridge Scheduler scaffold — fill in handler + role ARNs.`);
        break;
      }
      case 'llm':
        warnings.push(`llm "${b.name}": AWS Bedrock — no resource; grant bedrock:InvokeModel IAM to the compute role.`);
        break;
      case 'email':
        warnings.push(`email "${b.name}": AWS SES — verify a sending identity; grant ses:SendEmail to the compute role.`);
        break;
      case 'realtime':
        warnings.push(`realtime "${b.name}": API Gateway WebSocket scaffold not generated; eject to author routes.`);
        break;
    }
  }

  const importList = [...imports].filter((i) => i.includes(' as ')).join(',\n  ');
  const coreImports = [...imports].filter((i) => !i.includes(' as ')).join(', ');
  lines.push(`// Auto-generated by cruz (target: aws). Scaffold — review before deploy.`);
  lines.push(`import { ${coreImports}${importList ? ',\n  ' + importList : ''} } from 'aws-cdk-lib';`);
  lines.push(`import { Construct } from 'constructs';`);
  lines.push('');
  lines.push(`export class ${id(ctx.app)}Stack extends Stack {`);
  lines.push(`  constructor(scope: Construct, id: string, props?: StackProps) {`);
  lines.push(`    super(scope, id, props);`);
  lines.push(...body);
  lines.push(`  }`);
  lines.push(`}`);

  return { files: [{ path: 'stack.ts', content: lines.join('\n') + '\n' }], secrets, warnings };
}

export const awsAdapter: TargetAdapter = { manifest: awsManifest, generate };
