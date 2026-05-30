// Services
export { IntegrationService } from './integration.service';
export { FigmaService } from './figma.service';
export { SentryService } from './sentry.service';

// Router
export { integrationTrpc } from './integration.trpc';

// Module
export { IntegrationModule } from './integration.module';

// Job Handler
export { IntegrationSyncJobHandler } from './sync.job-handler';

// Types (excluding those already exported by database/schema)
export type {
  SyncDirection,
  JiraIntegrationConfig,
  LinearIntegrationConfig,
  FigmaIntegrationConfig,
  SentryIntegrationConfig,
  IntegrationConfig,
  IntegrationSyncPayload,
  FigmaEmbedData,
  SentryIssueEvent,
  SyncHistoryEntry,
  IntegrationConnectionSummary,
} from './integration.types';

export {
  SyncDirectionValues,
  JiraIntegrationConfigSchema,
  LinearIntegrationConfigSchema,
  FigmaIntegrationConfigSchema,
  SentryIntegrationConfigSchema,
  IntegrationConfigSchema,
  IntegrationSyncPayloadSchema,
} from './integration.types';


// Components
export * from './components';
