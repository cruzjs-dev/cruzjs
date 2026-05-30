/**
 * AI tRPC Router
 *
 * Provides tRPC endpoints for AI chat, embeddings, and provider listing.
 * Uses the OOP router pattern with @Router() and @Route() decorators.
 */

import { z } from 'zod';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { AIProviderRegistry } from './providers/registry';
import type { AIResponse } from './providers/provider.interface';

const aiMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  toolCallId: z.string().optional(),
  name: z.string().optional(),
});

const toolDefSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.string(), z.unknown()),
});

const modelOptionsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.union([z.array(toolDefSchema), z.literal('none')]).optional(),
  maxToolRounds: z.number().positive().optional(),
}).optional();

const chatInputSchema = z.object({
  messages: z.array(aiMessageSchema).min(1),
  options: modelOptionsSchema,
  provider: z.string().optional(),
});

const embedInputSchema = z.object({
  texts: z.array(z.string()).min(1),
  provider: z.string().optional(),
});

@Router()
export class AITrpc extends TrpcRouter {
  @Inject(AIProviderRegistry) private registry!: AIProviderRegistry;

  /**
   * Chat completion — returns the full response (non-streaming).
   * For streaming, use the EventSource pattern on the client.
   */
  @Route() chat = protectedProcedure
    .input(chatInputSchema)
    .mutation(async ({ input }): Promise<AIResponse> => {
      const provider = this.registry.resolve(input.provider);
      return provider.chat(input.messages, input.options);
    });

  /**
   * Generate text embeddings.
   */
  @Route() embed = protectedProcedure
    .input(embedInputSchema)
    .mutation(async ({ input }): Promise<{ embeddings: number[][] }> => {
      const provider = this.registry.resolve(input.provider);
      const embeddings = await provider.embed(input.texts);
      return { embeddings };
    });

  /**
   * List all registered AI providers.
   */
  @Route() providers = protectedProcedure
    .query((): { providers: string[] } => {
      return { providers: this.registry.list() };
    });

  // TODO: Implement streaming via tRPC subscriptions or a dedicated SSE endpoint.
  // The `stream` method on IAIProvider returns an AsyncIterable<StreamChunk>,
  // which maps naturally to tRPC subscriptions (observable pattern).
  // For now, use the `chat` mutation for complete responses, or call the provider
  // directly from server-side code for streaming use cases.
}

export { AITrpc as aiTrpc };
