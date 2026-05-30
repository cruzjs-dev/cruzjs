import type { AiProvider } from '../database/schema';

export const CUSTOM_MODEL_ID = '__custom__';

export interface AiProviderConfig {
  provider: AiProvider;
  label: string;
  models: { id: string; label: string }[];
  defaultModel: string;
  testEndpoint: string;
}

export const AI_PROVIDER_CONFIGS: Record<AiProvider, AiProviderConfig> = {
  ANTHROPIC: {
    provider: 'ANTHROPIC',
    label: 'Anthropic',
    models: [
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet v2' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { id: CUSTOM_MODEL_ID, label: 'Custom model...' },
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    testEndpoint: 'https://api.anthropic.com/v1/messages',
  },
  OPENAI: {
    provider: 'OPENAI',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'o3', label: 'o3' },
      { id: 'o3-mini', label: 'o3 Mini' },
      { id: 'o4-mini', label: 'o4 Mini' },
      { id: 'o1', label: 'o1' },
      { id: 'o1-mini', label: 'o1 Mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-4', label: 'GPT-4' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { id: CUSTOM_MODEL_ID, label: 'Custom model...' },
    ],
    defaultModel: 'gpt-4o',
    testEndpoint: 'https://api.openai.com/v1/models',
  },
  GEMINI: {
    provider: 'GEMINI',
    label: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
      { id: CUSTOM_MODEL_ID, label: 'Custom model...' },
    ],
    defaultModel: 'gemini-2.0-flash',
    testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  FIREWORKS: {
    provider: 'FIREWORKS',
    label: 'Fireworks AI',
    models: [
      { id: 'accounts/fireworks/models/deepseek-v3p2', label: 'DeepSeek V3p2' },
      { id: 'accounts/fireworks/models/kimi-k2-instruct-0905', label: 'Kimi K2 Instruct' },
      { id: 'accounts/fireworks/models/kimi-k2-thinking', label: 'Kimi K2 Thinking' },
      { id: 'accounts/fireworks/models/kimi-k2p5', label: 'Kimi K2.5' },
      { id: 'accounts/fireworks/models/glm-5', label: 'GLM 5' },
      { id: 'accounts/fireworks/models/glm-4p7', label: 'GLM 4.7' },
      { id: 'accounts/fireworks/models/gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: 'accounts/fireworks/models/gpt-oss-20b', label: 'GPT-OSS 20B' },
      { id: 'accounts/fireworks/models/minimax-m2p1', label: 'MiniMax M2.1' },
      { id: 'accounts/fireworks/models/mixtral-8x22b-instruct', label: 'Mixtral 8x22B' },
      { id: CUSTOM_MODEL_ID, label: 'Custom model...' },
    ],
    defaultModel: 'accounts/fireworks/models/deepseek-v3p2',
    testEndpoint: 'https://api.fireworks.ai/inference/v1/models',
  },
};
