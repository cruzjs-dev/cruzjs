import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { AiConnectionsService } from './ai-connections.service';
import {
  ConnectAiInputSchema,
  DisconnectAiInputSchema,
  UpdateAiConnectionInputSchema,
  TestAiConnectionInputSchema,
  GetAiModelsInputSchema,
} from './ai-connections.types';
import { AI_PROVIDER_CONFIGS } from './ai-connections.models';
import type { AiProvider } from '../database/schema';

export const aiConnectionsTrpc = router({
  /** List AI connections — metadata only, keys never returned. */
  list: orgProcedure.query(async ({ ctx }) => {
    const service = ctx.container.get<AiConnectionsService>(AiConnectionsService);
    return service.listConnections(ctx.org.org.orgId);
  }),

  /** Connect a new AI provider with API key. */
  connect: orgProcedure
    .input(ConnectAiInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<AiConnectionsService>(AiConnectionsService);
      return service.connect(ctx.org.org.orgId, ctx.org.org.userId, input);
    }),

  /** Disconnect an AI provider. */
  disconnect: orgProcedure
    .input(DisconnectAiInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<AiConnectionsService>(AiConnectionsService);
      return service.disconnect(ctx.org.org.orgId, input.provider);
    }),

  /** Update an AI connection (model, name, enabled, default, or API key). */
  update: orgProcedure
    .input(UpdateAiConnectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<AiConnectionsService>(AiConnectionsService);
      return service.update(ctx.org.org.orgId, input);
    }),

  /** Test an AI provider connection. */
  testConnection: orgProcedure
    .input(TestAiConnectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<AiConnectionsService>(AiConnectionsService);
      return service.testConnection(ctx.org.org.orgId, input.provider);
    }),

  /** Get available models for a provider (static data). */
  getModels: orgProcedure
    .input(GetAiModelsInputSchema)
    .query(({ input }) => {
      const config = AI_PROVIDER_CONFIGS[input.provider as AiProvider];
      return config ? { models: config.models, defaultModel: config.defaultModel } : { models: [], defaultModel: '' };
    }),
});
