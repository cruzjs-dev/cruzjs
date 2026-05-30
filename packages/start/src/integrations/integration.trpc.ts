import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { IntegrationService } from './integration.service';
import { FigmaService } from './figma.service';
import { SentryService } from './sentry.service';
import {
  IntegrationProviderValues,
  IntegrationConfigSchema,
  FigmaIntegrationConfigSchema,
  SentryIntegrationConfigSchema,
} from './integration.types';
import type {
  FigmaIntegrationConfig,
  SentryIntegrationConfig,
} from './integration.types';

/**
 * Integration Router - tRPC endpoints for integration management
 *
 * Provides connection CRUD, test connection, trigger sync,
 * sync history, Figma embed, and Sentry webhook handling.
 */
export const integrationTrpc = router({
  /**
   * List all integration connections for the org
   */
  listConnections: orgProcedure
    .input(z.object({
      provider: z.enum(IntegrationProviderValues).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      return service.listConnections(ctx.org.org.orgId, input?.provider);
    }),

  /**
   * Get a single integration connection
   */
  getConnection: orgProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      const conn = await service.getConnection(ctx.org.org.orgId, input.connectionId);
      return {
        ...conn,
        config: JSON.parse(conn.config ?? '{}'),
      };
    }),

  /**
   * Create a new integration connection
   */
  createConnection: orgProcedure
    .input(z.object({
      provider: z.enum(IntegrationProviderValues),
      name: z.string().min(1).max(100),
      config: IntegrationConfigSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      return service.createConnection(
        ctx.org.org.orgId,
        input.provider,
        input.name,
        input.config,
        ctx.org.org.userId,
      );
    }),

  /**
   * Update an integration connection
   */
  updateConnection: orgProcedure
    .input(z.object({
      connectionId: z.string(),
      name: z.string().min(1).max(100).optional(),
      config: IntegrationConfigSchema.optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      return service.updateConnection(ctx.org.org.orgId, input.connectionId, {
        name: input.name,
        config: input.config,
        status: input.status,
      });
    }),

  /**
   * Delete an integration connection
   */
  deleteConnection: orgProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      return service.deleteConnection(ctx.org.org.orgId, input.connectionId);
    }),

  /**
   * Test an integration connection
   */
  testConnection: orgProcedure
    .input(IntegrationConfigSchema)
    .mutation(async ({ ctx, input }) => {
      switch (input.provider) {
        case 'FIGMA': {
          const figma = ctx.container.get<FigmaService>(FigmaService);
          return figma.testConnection(input as FigmaIntegrationConfig);
        }
        case 'SENTRY': {
          const sentry = ctx.container.get<SentryService>(SentryService);
          return sentry.testConnection(input as SentryIntegrationConfig);
        }
        default:
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported provider' });
      }
    }),

  /**
   * Trigger a manual sync for a connection
   */
  triggerSync: orgProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      const conn = await service.getConnection(ctx.org.org.orgId, input.connectionId);
      const config = JSON.parse(conn.config ?? '{}');

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Sync is not supported for provider: ${config.provider}`,
      });
    }),

  /**
   * Get sync history for a connection
   */
  getSyncHistory: orgProcedure
    .input(z.object({
      connectionId: z.string(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      return service.getSyncHistory(ctx.org.org.orgId, input.connectionId, input.limit);
    }),

  /**
   * Get Figma embed data for a URL
   */
  getFigmaEmbed: orgProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const figma = ctx.container.get<FigmaService>(FigmaService);
      return figma.getEmbed(input.url);
    }),

  /**
   * Handle incoming Sentry webhook event
   *
   * This endpoint is called by Sentry when an issue event occurs.
   * The connection is identified by the org context and Sentry config.
   */
  handleSentryWebhook: orgProcedure
    .input(z.object({
      connectionId: z.string(),
      body: z.string(),
      signature: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<IntegrationService>(IntegrationService);
      const conn = await service.getConnection(ctx.org.org.orgId, input.connectionId);
      const config = JSON.parse(conn.config ?? '{}') as SentryIntegrationConfig;

      if (config.provider !== 'SENTRY') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Connection is not a Sentry integration' });
      }

      // Verify webhook signature
      const sentry = ctx.container.get<SentryService>(SentryService);
      const isValid = await sentry.verifySignature(input.body, input.signature, config.webhookSecret);
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid Sentry webhook signature' });
      }

      const event = JSON.parse(input.body);
      return sentry.handleWebhookEvent(
        input.connectionId,
        ctx.org.org.orgId,
        config,
        event,
      );
    }),
});
