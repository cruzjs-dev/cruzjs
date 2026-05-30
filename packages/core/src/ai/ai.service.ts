/**
 * AI Service
 * Provides structured data extraction, chat, embeddings, image description,
 * and sentiment analysis via Cloudflare AI Gateway and Workers AI.
 */
import { injectable } from 'inversify';
import type { z } from 'zod';
import { CloudflareContext } from '../shared/cloudflare/context';

export type ChatOptions = {
  prompt: string;
  system?: string;
  size?: 'small' | 'medium' | 'large';
  temperature?: number;
  maxTokens?: number;
};

export type SentimentResult = {
  label: string;
  score: number;
};

export type EmbeddingModel = 'small' | 'base' | 'large';

export type ExtractionOptions<T> = {
  prompt: string;
  system: string;
  schema: z.ZodType<T>;
  schemaName: string;
  size?: 'small' | 'medium' | 'large';
  temperature?: number;
  maxRetries?: number;
};

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

type GatewayConfig = {
  accountId: string;
  gatewayId: string;
  apiKey: string | null;
  gatewayToken: string;
};

type GatewayMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GatewayResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

// AI Gateway models (routed via the gateway's OpenAI-compatible endpoint).
const MODEL_MAP = {
  small: 'google-ai-studio/gemini-2.5-flash-lite',
  medium: 'google-ai-studio/gemini-2.5-flash',
  large: 'google-ai-studio/gemini-2.5-pro',
} as const;

// Workers AI models (called directly via the env.AI binding, no gateway).
const WORKERS_AI_MODEL_MAP = {
  small: '@cf/meta/llama-3.1-8b-instruct',
  medium: '@cf/meta/llama-3.1-8b-instruct',
  large: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
} as const;

export type AIProvider = 'workers-ai' | 'gateway';

const EMBEDDING_MODEL_MAP: Record<EmbeddingModel, string> = {
  small: '@cf/baai/bge-small-en-v1.5',
  base: '@cf/baai/bge-base-en-v1.5',
  large: '@cf/baai/bge-large-en-v1.5',
};

@injectable()
export class AIService {
  /**
   * Resolve config lazily per-request (env vars aren't available at DI construction time)
   */
  private getConfig(): GatewayConfig | null {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const gatewayId = process.env.CF_AI_GATEWAY_ID;
    const apiKey = process.env.AI_API_KEY ?? null;
    const gatewayToken = process.env.CF_AIG_TOKEN;

    if (!accountId || !gatewayId || !gatewayToken) {
      return null;
    }

    return { accountId, gatewayId, apiKey, gatewayToken };
  }

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  /**
   * Resolve which AI provider to use, controlled by the `AI_PROVIDER` env var:
   *   - 'workers-ai' : call the Workers AI binding (env.AI) directly.
   *   - 'gateway'    : route through a (custom) Cloudflare AI Gateway.
   *   - unset/'auto' : use the gateway if configured, else Workers AI.
   * If 'gateway' is requested but not configured, falls back to Workers AI.
   */
  getProvider(): AIProvider {
    const explicit = (process.env.AI_PROVIDER || '').toLowerCase().replace(/_/g, '-');
    if (explicit === 'workers-ai') {
      return 'workers-ai';
    }
    if (explicit === 'gateway') {
      if (this.getConfig()) {
        return 'gateway';
      }
      console.warn(
        '[AIService] AI_PROVIDER=gateway but gateway is not configured (need CLOUDFLARE_ACCOUNT_ID, CF_AI_GATEWAY_ID, CF_AIG_TOKEN); falling back to Workers AI.'
      );
      return 'workers-ai';
    }
    // auto
    return this.getConfig() ? 'gateway' : 'workers-ai';
  }

  /**
   * Resolve the Workers AI binding (`env.AI`), throwing a helpful error if it's
   * missing — almost always a configuration problem, not a transient failure.
   */
  private requireWorkersAI<T = unknown>(): T {
    const ai = CloudflareContext.ai as T | null;
    if (!ai) {
      throw new Error(
        'Workers AI binding (env.AI) is not available. ' +
          'Enable the `ai` binding for this environment (set `ai: true` in cruz.config.ts ' +
          'bindings, or add an `[ai]` binding to your wrangler config) and redeploy — and ' +
          'make sure this code runs in the Cloudflare Workers runtime (not plain Node). ' +
          'To use an AI Gateway instead, set AI_PROVIDER=gateway and configure ' +
          'CLOUDFLARE_ACCOUNT_ID, CF_AI_GATEWAY_ID, and the CF_AIG_TOKEN secret.'
      );
    }
    return ai;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send a chat completion request to Cloudflare AI Gateway.
   * Returns the raw response text content.
   */
  private async callGateway(
    messages: GatewayMessage[],
    model: string,
    temperature: number,
    maxTokens?: number,
    responseFormat?: { type: string },
  ): Promise<string | null> {
    const config = this.getConfig();
    if (!config) {
      console.warn('[AIService] Not configured - missing CLOUDFLARE_ACCOUNT_ID, CF_AI_GATEWAY_ID, or CF_AIG_TOKEN');
      return null;
    }

    const url = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/compat/chat/completions`;

    const body: Record<string, unknown> = {
      model,
      temperature,
      messages,
    };

    if (maxTokens !== undefined) {
      body.max_tokens = maxTokens;
    }

    if (responseFormat) {
      body.response_format = responseFormat;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${config.gatewayToken}`,
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`AI Gateway returned ${resp.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await resp.json() as GatewayResponse;
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('No content in AI Gateway response');
    }

    return text;
  }

  /**
   * Generate text. Honors the configured AI provider (Workers AI or gateway).
   * Returns the raw text response, or null on failure.
   */
  async chat(options: ChatOptions): Promise<string | null> {
    const messages: GatewayMessage[] = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: options.prompt });
    return this.chatMessages(messages, {
      size: options.size,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
  }

  /**
   * Multi-turn chat completion.
   *
   * Routes via the configured provider (see `getProvider`): the AI Gateway
   * (caching/observability/better models) or the Workers AI binding directly.
   * On gateway error, falls back to Workers AI. App code should call this
   * rather than touching the raw `env.AI` binding.
   */
  async chatMessages(
    messages: GatewayMessage[],
    opts?: { size?: 'small' | 'medium' | 'large'; temperature?: number; maxTokens?: number }
  ): Promise<string | null> {
    const size = opts?.size ?? 'medium';
    if (this.getProvider() === 'gateway') {
      try {
        return await this.callGateway(
          messages,
          MODEL_MAP[size],
          opts?.temperature ?? 0.7,
          opts?.maxTokens
        );
      } catch (error) {
        console.warn('[AIService] Gateway chat failed; falling back to Workers AI:', error);
      }
    }
    return this.workersAIChat(messages, WORKERS_AI_MODEL_MAP[size]);
  }

  /** Chat directly against the Workers AI binding (no gateway). */
  private async workersAIChat(
    messages: GatewayMessage[],
    model = '@cf/meta/llama-3.1-8b-instruct'
  ): Promise<string | null> {
    const ai = this.requireWorkersAI<{
      run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }>;
    }>();
    const result = await ai.run(model, { messages });
    return result.response?.trim() ?? null;
  }

  /**
   * Convert documents (PDF, etc.) to markdown via Workers AI `toMarkdown`.
   * Returns the markdown of the first file. The raw binding lives here so
   * feature code never touches `env.AI` directly.
   */
  async toMarkdown(files: { name: string; blob: Blob }[]): Promise<string> {
    const ai = this.requireWorkersAI<{
      toMarkdown: (files: { name: string; blob: Blob }[]) => Promise<Array<{ data?: string }>>;
    }>();
    const result = await ai.toMarkdown(files);
    return result?.[0]?.data ?? '';
  }

  /**
   * Generate text embeddings via Workers AI binding.
   * Returns an array of embedding vectors, or null on failure.
   */
  async embed(texts: string[], model: EmbeddingModel = 'base'): Promise<number[][] | null> {
    const ai = this.requireWorkersAI<{
      run: (model: string, input: Record<string, unknown>) => Promise<{ data: number[][] }>;
    }>();
    try {
      const modelId = EMBEDDING_MODEL_MAP[model];
      const result = await ai.run(modelId, { text: texts });

      return result.data;
    } catch (error) {
      console.error('[AIService] Embedding failed:', error);
      return null;
    }
  }

  /**
   * Describe an image using Workers AI vision model.
   * Returns a text description, or null on failure.
   */
  async describeImage(image: ArrayBuffer, prompt?: string): Promise<string | null> {
    const ai = this.requireWorkersAI<{
      run: (model: string, input: Record<string, unknown>) => Promise<{ description?: string; response?: string }>;
    }>();
    try {
      const result = await ai.run('@cf/llava-hf/llava-1.5-7b-hf', {
        image: [...new Uint8Array(image)],
        prompt: prompt ?? 'Describe this image in detail.',
        max_tokens: 512,
      });

      return result.description ?? result.response ?? null;
    } catch (error) {
      console.error('[AIService] Image description failed:', error);
      return null;
    }
  }

  /**
   * Analyze sentiment of text via Workers AI.
   * Returns the top sentiment label and confidence score, or null on failure.
   */
  async analyzeSentiment(text: string): Promise<SentimentResult | null> {
    const ai = this.requireWorkersAI<{
      run: (model: string, input: Record<string, unknown>) => Promise<Array<{ label: string; score: number }>[]>;
    }>();
    try {
      const result = await ai.run('@cf/huggingface/distilbert-sst-2-int8', {
        text,
      });

      // Workers AI returns nested array: [[{label, score}, ...]]
      const predictions = Array.isArray(result) && Array.isArray(result[0])
        ? result[0]
        : result;

      if (!Array.isArray(predictions) || predictions.length === 0) {
        console.warn('[AIService] Unexpected sentiment response format');
        return null;
      }

      // Return highest-scoring prediction
      const top = (predictions as Array<{ label: string; score: number }>).reduce(
        (best, curr) => (curr.score > best.score ? curr : best),
      );

      return { label: top.label, score: top.score };
    } catch (error) {
      console.error('[AIService] Sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Extract structured data from content with retry logic.
   * Honors the configured AI provider (gateway JSON mode, or Workers AI).
   */
  async extractStructured<T>(options: ExtractionOptions<T>): Promise<T | null> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const size = options.size || 'medium';
    const provider = this.getProvider();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = `${options.system}\n\nRespond ONLY with valid JSON matching the requested schema. No markdown, no explanation, just the JSON object.`;

        const promptMessages: GatewayMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: options.prompt },
        ];

        const text =
          provider === 'gateway'
            ? await this.callGateway(
                promptMessages,
                MODEL_MAP[size],
                options.temperature ?? 0.1,
                undefined,
                { type: 'json_object' }
              )
            : await this.workersAIChat(promptMessages, WORKERS_AI_MODEL_MAP[size]);

        if (!text) {
          throw new Error('No content returned from AI Gateway');
        }

        // Parse JSON from response
        const parsed = JSON.parse(text);

        console.log(`[AIService] Raw response (${options.schemaName}):`, JSON.stringify(parsed).slice(0, 200));

        // Validate against schema
        const validated = options.schema.safeParse(parsed);
        if (!validated.success) {
          console.error(
            `[AIService] Schema validation failed (attempt ${attempt}/${maxRetries}):`,
            validated.error.issues
          );
          lastError = new Error(`Schema validation failed: ${JSON.stringify(validated.error.issues)}`);

          if (attempt < maxRetries) {
            await this.sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          return null;
        }

        return validated.data;
      } catch (error) {
        console.error(`[AIService] Extraction failed (attempt ${attempt}/${maxRetries}):`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          await this.sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }
    }

    console.error('[AIService] All retry attempts exhausted. Last error:', lastError);
    return null;
  }
}
