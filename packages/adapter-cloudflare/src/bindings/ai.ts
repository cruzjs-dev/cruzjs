/**
 * Cloudflare AI Binding
 *
 * Wraps Cloudflare AI Gateway (HTTP) + Workers AI (binding) behind AIBinding interface.
 */

import type {
  AIBinding,
  AIChatOptions,
  AISentimentResult,
  AIExtractOptions,
} from '@cruzjs/core/runtime';

type GatewayConfig = {
  accountId: string;
  gatewayId: string;
  gatewayToken: string;
  apiKey: string | null;
};

const MODEL_MAP = {
  small: 'google-ai-studio/gemini-2.5-flash-lite',
  medium: 'google-ai-studio/gemini-2.5-flash',
  large: 'google-ai-studio/gemini-2.5-pro',
} as const;

const EMBEDDING_MODEL_MAP: Record<string, string> = {
  small: '@cf/baai/bge-small-en-v1.5',
  base: '@cf/baai/bge-base-en-v1.5',
  large: '@cf/baai/bge-large-en-v1.5',
};

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class CloudflareAIBinding implements AIBinding {
  constructor(
    private config: GatewayConfig,
    private workersAI: unknown | null,
  ) {}

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async callGateway(
    messages: { role: string; content: string }[],
    model: string,
    temperature: number,
    maxTokens?: number,
    responseFormat?: { type: string },
  ): Promise<string | null> {
    const url = `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}/compat/chat/completions`;
    const body: Record<string, unknown> = { model, temperature, messages };
    if (maxTokens !== undefined) body.max_tokens = maxTokens;
    if (responseFormat) body.response_format = responseFormat;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${this.config.gatewayToken}`,
        ...(this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(
        `AI Gateway returned ${resp.status}: ${errorText.slice(0, 200)}`,
      );
    }

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  }

  async chat(options: AIChatOptions): Promise<string | null> {
    try {
      const model = MODEL_MAP[options.size || 'medium'];
      const messages: { role: string; content: string }[] = [];
      if (options.system)
        messages.push({ role: 'system', content: options.system });
      messages.push({ role: 'user', content: options.prompt });
      return await this.callGateway(
        messages,
        model,
        options.temperature ?? 0.7,
        options.maxTokens,
      );
    } catch (error) {
      console.error('[CloudflareAI] Chat failed:', error);
      return null;
    }
  }

  async embed(
    texts: string[],
    model: string = 'base',
  ): Promise<number[][] | null> {
    try {
      const ai = this.workersAI as {
        run: (
          model: string,
          input: Record<string, unknown>,
        ) => Promise<{ data: number[][] }>;
      } | null;
      if (!ai) return null;
      const modelId = EMBEDDING_MODEL_MAP[model] || model;
      const result = await ai.run(modelId, { text: texts });
      return result.data;
    } catch (error) {
      console.error('[CloudflareAI] Embedding failed:', error);
      return null;
    }
  }

  async describeImage(
    image: ArrayBuffer,
    prompt?: string,
  ): Promise<string | null> {
    try {
      const ai = this.workersAI as {
        run: (
          model: string,
          input: Record<string, unknown>,
        ) => Promise<{ description?: string; response?: string }>;
      } | null;
      if (!ai) return null;
      const result = await ai.run('@cf/llava-hf/llava-1.5-7b-hf', {
        image: [...new Uint8Array(image)],
        prompt: prompt ?? 'Describe this image in detail.',
        max_tokens: 512,
      });
      return result.description ?? result.response ?? null;
    } catch (error) {
      console.error('[CloudflareAI] Image description failed:', error);
      return null;
    }
  }

  async analyzeSentiment(text: string): Promise<AISentimentResult | null> {
    try {
      const ai = this.workersAI as {
        run: (
          model: string,
          input: Record<string, unknown>,
        ) => Promise<any>;
      } | null;
      if (!ai) return null;
      const result = await ai.run(
        '@cf/huggingface/distilbert-sst-2-int8',
        { text },
      );
      const predictions =
        Array.isArray(result) && Array.isArray(result[0])
          ? result[0]
          : result;
      if (!Array.isArray(predictions) || predictions.length === 0)
        return null;
      const top = (
        predictions as Array<{ label: string; score: number }>
      ).reduce((best, curr) => (curr.score > best.score ? curr : best));
      return { label: top.label, score: top.score };
    } catch (error) {
      console.error('[CloudflareAI] Sentiment analysis failed:', error);
      return null;
    }
  }

  async extractStructured<T>(
    options: AIExtractOptions<T>,
  ): Promise<T | null> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const model = MODEL_MAP[options.size || 'medium'];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = `${options.system}\n\nRespond ONLY with valid JSON matching the requested schema. No markdown, no explanation, just the JSON object.`;
        const text = await this.callGateway(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: options.prompt },
          ],
          model,
          options.temperature ?? 0.1,
          undefined,
          { type: 'json_object' },
        );
        if (!text) throw new Error('No content returned from AI Gateway');
        const parsed = JSON.parse(text);
        const validated = options.schema.safeParse(parsed);
        if (!validated.success) {
          if (attempt < maxRetries) {
            await this.sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          return null;
        }
        return validated.data!;
      } catch (error) {
        if (attempt < maxRetries) {
          await this.sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }
    }
    return null;
  }
}
