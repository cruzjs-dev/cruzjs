import { z } from 'zod';
import { AiProviderValues } from '../database/schema';

export const ConnectAiInputSchema = z.object({
  provider: z.enum(AiProviderValues),
  apiKey: z.string().min(1, 'API key is required'),
  displayName: z.string().optional(),
  selectedModel: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type ConnectAiInput = z.infer<typeof ConnectAiInputSchema>;

export const DisconnectAiInputSchema = z.object({
  provider: z.enum(AiProviderValues),
});

export type DisconnectAiInput = z.infer<typeof DisconnectAiInputSchema>;

export const UpdateAiConnectionInputSchema = z.object({
  provider: z.enum(AiProviderValues),
  displayName: z.string().optional(),
  selectedModel: z.string().optional(),
  isEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  apiKey: z.string().optional(), // only if updating the key
});

export type UpdateAiConnectionInput = z.infer<typeof UpdateAiConnectionInputSchema>;

export const TestAiConnectionInputSchema = z.object({
  provider: z.enum(AiProviderValues),
});

export type TestAiConnectionInput = z.infer<typeof TestAiConnectionInputSchema>;

export const GetAiModelsInputSchema = z.object({
  provider: z.enum(AiProviderValues),
});
