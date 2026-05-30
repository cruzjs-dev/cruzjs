/**
 * Integration Module
 *
 * Registers integration services and the integration tRPC router.
 * Provides Jira sync, Linear sync, Figma embedding, and Sentry ingestion.
 */

/**
 * Integration Module
 *
 * Registers integration services and the integration tRPC router.
 * Provides Jira sync, Linear sync, Figma embedding, and Sentry ingestion.
 */

import { Module } from '@cruzjs/core/di';
import { IntegrationService } from './integration.service';
import { FigmaService } from './figma.service';
import { SentryService } from './sentry.service';
import { integrationTrpc } from './integration.trpc';

@Module({
  providers: [
    IntegrationService,
    FigmaService,
    SentryService,
  ],
  trpcRouters: {
    integrations: integrationTrpc,
  },
})
export class IntegrationModule {}
