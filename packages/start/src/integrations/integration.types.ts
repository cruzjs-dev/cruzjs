import { z } from 'zod';
import {
  IntegrationProviderValues,
  type IntegrationProviderType as IntegrationProvider,
  IntegrationConnectionStatusValues as ConnectionStatusValues,
  type IntegrationConnectionStatus as ConnectionStatus,
  IntegrationSyncStatusValues as SyncStatusValues,
  type IntegrationSyncStatus as SyncStatus,
} from '../database/schema';

export type { IntegrationProvider, ConnectionStatus, SyncStatus };
export { IntegrationProviderValues, ConnectionStatusValues, SyncStatusValues };

// ============================================================================
// Sync Direction
// ============================================================================

export const SyncDirectionValues = ['PULL'] as const;
export type SyncDirection = (typeof SyncDirectionValues)[number];

// ============================================================================
// Connection Configs (discriminated union by provider)
// ============================================================================

export const JiraIntegrationConfigSchema = z.object({
  provider: z.literal('JIRA'),
  baseUrl: z.string().url('Valid Jira base URL required'),
  email: z.string().email('Valid email required'),
  apiToken: z.string().min(1, 'API token is required'),
  projectKey: z.string().min(1, 'Jira project key is required'),
  jql: z.string().optional(),
  /** Status mapping: Jira status name -> app status */
  statusMapping: z.record(z.string(), z.string()).optional(),
  /** Sync schedule in cron-like format or interval: 'manual' | '15m' | '1h' | '6h' | '24h' */
  syncSchedule: z.string().default('manual'),
  /** App project to sync into */
  targetProjectId: z.string().min(1, 'Target project is required'),
});

export const LinearIntegrationConfigSchema = z.object({
  provider: z.literal('LINEAR'),
  apiKey: z.string().min(1, 'Linear API key is required'),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  /** Status mapping: Linear status name -> app status */
  statusMapping: z.record(z.string(), z.string()).optional(),
  /** Sync schedule */
  syncSchedule: z.string().default('manual'),
  /** App project to sync into */
  targetProjectId: z.string().min(1, 'Target project is required'),
});

export const FigmaIntegrationConfigSchema = z.object({
  provider: z.literal('FIGMA'),
  /** Figma personal access token */
  accessToken: z.string().min(1, 'Figma access token is required'),
});

export const SentryIntegrationConfigSchema = z.object({
  provider: z.literal('SENTRY'),
  /** DSN or organization slug for identification */
  organizationSlug: z.string().min(1, 'Sentry organization slug is required'),
  /** Sentry project slug */
  projectSlug: z.string().optional(),
  /** Webhook signing secret (for validating incoming webhooks) */
  webhookSecret: z.string().min(1, 'Webhook secret is required'),
  /** App project ID for auto-created bug items */
  targetProjectId: z.string().min(1, 'Target project is required'),
  /** Whether to auto-create work items from new Sentry issues */
  autoCreateBugs: z.boolean().default(true),
  /** Minimum Sentry level to create bugs: 'error' | 'fatal' */
  minLevel: z.string().default('error'),
});

export const IntegrationConfigSchema = z.discriminatedUnion('provider', [
  JiraIntegrationConfigSchema,
  LinearIntegrationConfigSchema,
  FigmaIntegrationConfigSchema,
  SentryIntegrationConfigSchema,
]);

export type JiraIntegrationConfig = z.infer<typeof JiraIntegrationConfigSchema>;
export type LinearIntegrationConfig = z.infer<typeof LinearIntegrationConfigSchema>;
export type FigmaIntegrationConfig = z.infer<typeof FigmaIntegrationConfigSchema>;
export type SentryIntegrationConfig = z.infer<typeof SentryIntegrationConfigSchema>;
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

// ============================================================================
// Sync Job Payload
// ============================================================================

export const IntegrationSyncPayloadSchema = z.object({
  connectionId: z.string(),
  orgId: z.string(),
  provider: z.enum(IntegrationProviderValues),
  direction: z.enum(SyncDirectionValues).default('PULL'),
});

export type IntegrationSyncPayload = z.infer<typeof IntegrationSyncPayloadSchema>;

// ============================================================================
// Figma oEmbed Types
// ============================================================================

export type FigmaEmbedData = {
  url: string;
  title: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  provider: 'figma';
};

// ============================================================================
// Sentry Webhook Types
// ============================================================================

export type SentryIssueEvent = {
  action: string;
  data: {
    issue: {
      id: string;
      title: string;
      culprit: string;
      shortId: string;
      level: string;
      status: string;
      platform: string;
      project: { id: string; name: string; slug: string };
      metadata: {
        type?: string;
        value?: string;
        filename?: string;
        function?: string;
      };
      count: string;
      firstSeen: string;
      lastSeen: string;
      permalink: string;
    };
  };
  installation?: { uuid: string };
};

// ============================================================================
// Sync History Entry
// ============================================================================

export type SyncHistoryEntry = {
  id: string;
  connectionId: string;
  provider: IntegrationProvider;
  direction: SyncDirection;
  status: SyncStatus;
  itemsSynced: number;
  itemsFailed: number;
  itemsSkipped: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

// ============================================================================
// Connection Summary (for UI)
// ============================================================================

export type IntegrationConnectionSummary = {
  id: string;
  orgId: string;
  provider: IntegrationProvider;
  name: string;
  status: ConnectionStatus;
  config: IntegrationConfig;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus | null;
  createdAt: string;
  updatedAt: string;
};
