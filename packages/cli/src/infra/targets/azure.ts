/**
 * Azure target adapter.
 *
 * IaC is declarative Bicep (main.bicep). Bicep can declare every resource, so
 * this is the most complete non-Cloudflare target. The rung-4 raw object patch
 * is merged into the resource's `properties`. A container-class compute model
 * (Container Apps) is assumed; note the 230s HTTP cap on Functions surfaced by
 * the runtime block (handled elsewhere).
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

export const azureManifest: CapabilityManifest = {
  target: 'azure',
  capabilities: {
    sql: { native: { postgres: 'postgres-flex', mysql: 'mysql-flex' }, services: ['azure-sql', 'postgres-flex', 'cosmos'] },
    kv: { native: { '*': 'cache-redis' }, services: ['cache-redis'] },
    blob: { native: { '*': 'blob-storage' } },
    queue: { native: { work: 'service-bus', fanout: 'event-grid', '*': 'service-bus' }, services: ['service-bus', 'storage-queue', 'event-grid'] },
    vector: { native: { '*': 'ai-search' } },
    search: { native: { '*': 'ai-search' } },
    llm: { native: { '*': 'azure-openai' } },
    email: { native: { '*': 'communication-services' } },
    cron: { native: { '*': 'timer-trigger' } },
    realtime: { native: { '*': 'signalr' } },
  },
  iac: { format: 'bicep', emit: 'main.bicep' },
};

function bicepValue(v: unknown, indent: string): string {
  if (typeof v === 'string') return `'${v}'`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => bicepValue(x, indent)).join(', ')}]`;
  if (v && typeof v === 'object') {
    const inner = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${indent}  ${k}: ${bicepValue(val, indent + '  ')}`)
      .join('\n');
    return `{\n${inner}\n${indent}}`;
  }
  return 'null';
}

function resourceBlock(
  symbol: string,
  type: string,
  name: string,
  properties: Record<string, unknown>,
  raw: unknown
): string {
  const props = { ...properties };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    Object.assign(props, raw as Record<string, unknown>);
  }
  const fields: Record<string, unknown> = { name, location: 'cdk:location', ...props };
  const body = Object.entries(fields)
    .map(([k, v]) => `  ${k}: ${v === 'cdk:location' ? 'location' : bicepValue(v, '  ')}`)
    .join('\n');
  return `resource ${symbol} '${type}' = {\n${body}\n}`;
}

function generate(resolved: ResolvedBinding[], ctx: GenContext): GeneratedArtifact {
  const sym = (s: string) => bindingVar(s).toLowerCase();
  const blocks: string[] = [];
  const secrets: string[] = [];
  const warnings: string[] = [];

  for (const b of resolved) {
    if (b.sourcing === 'saas' || b.sourcing === 'external') {
      const secret = b.external?.ref?.replace(/^env:/, '') ?? connectionSecret(b.name);
      secrets.push(secret);
      warnings.push(`${b.type} "${b.name}": ${b.sourcing} — via Key Vault secret ${secret}; no Bicep resource.`);
      continue;
    }
    const s = sym(b.name);
    const rname = resourceName(ctx.app, ctx.env, b.name).replace(/[^a-z0-9-]/gi, '');
    switch (b.type) {
      case 'sql':
        blocks.push(resourceBlock(s, 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview', rname,
          { sku: { name: 'Standard_B1ms', tier: 'Burstable' }, properties: { version: '16', storage: { storageSizeGB: 32 } } }, b.raw));
        break;
      case 'kv':
        blocks.push(resourceBlock(s, 'Microsoft.Cache/redis@2023-08-01', rname,
          { properties: { sku: { name: 'Basic', family: 'C', capacity: 0 } } }, b.raw));
        break;
      case 'blob':
        blocks.push(resourceBlock(s, 'Microsoft.Storage/storageAccounts@2023-01-01', rname.slice(0, 24),
          { sku: { name: 'Standard_LRS' }, kind: 'StorageV2' }, b.raw));
        break;
      case 'queue':
        if (b.service === 'event-grid') {
          blocks.push(resourceBlock(s, 'Microsoft.EventGrid/topics@2022-06-15', rname, { properties: {} }, b.raw));
        } else {
          blocks.push(resourceBlock(s, 'Microsoft.ServiceBus/namespaces@2022-10-01-preview', rname,
            { sku: { name: 'Standard', tier: 'Standard' } }, b.raw));
        }
        break;
      case 'vector':
      case 'search':
        blocks.push(resourceBlock(s, 'Microsoft.Search/searchServices@2023-11-01', rname,
          { sku: { name: 'basic' }, properties: { replicaCount: 1, partitionCount: 1 } }, b.raw));
        break;
      case 'llm':
        blocks.push(resourceBlock(s, 'Microsoft.CognitiveServices/accounts@2023-05-01', rname,
          { kind: 'OpenAI', sku: { name: 'S0' }, properties: {} }, b.raw));
        break;
      case 'email':
        blocks.push(resourceBlock(s, 'Microsoft.Communication/communicationServices@2023-04-01', rname,
          { properties: { dataLocation: 'UnitedStates' } }, b.raw));
        break;
      case 'realtime':
        blocks.push(resourceBlock(s, 'Microsoft.SignalRService/signalR@2023-02-01', rname,
          { sku: { name: 'Free_F1', tier: 'Free', capacity: 1 } }, b.raw));
        break;
      case 'cron': {
        const schedules = Array.isArray(b.options.schedule) ? b.options.schedule : b.options.schedule ? [b.options.schedule] : [];
        warnings.push(`cron "${b.name}": use a Container Apps job / Function timer trigger for [${(schedules as string[]).join(', ')}]; not a standalone Bicep resource.`);
        break;
      }
    }
  }

  const lines = [
    `// Auto-generated by cruz (target: azure). Scaffold — review before deploy.`,
    `param location string = resourceGroup().location`,
    '',
    ...blocks,
    '',
  ];

  return { files: [{ path: 'main.bicep', content: lines.join('\n') }], secrets, warnings };
}

export const azureAdapter: TargetAdapter = { manifest: azureManifest, generate };
