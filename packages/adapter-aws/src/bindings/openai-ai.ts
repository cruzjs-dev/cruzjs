import type {
  AIBinding,
  AIChatOptions,
  AISentimentResult,
  AIExtractOptions,
} from '@cruzjs/core/runtime';

const MODEL_MAP = {
  small: 'gpt-4o-mini',
  medium: 'gpt-4o',
  large: 'gpt-4o',
} as const;

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * OpenAI-compatible AI binding.
 * Works with OpenAI API, AWS Bedrock (via gateway), or any compatible endpoint.
 */
export class OpenAICompatibleAIBinding implements AIBinding {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    baseUrl: string = 'https://api.openai.com/v1',
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async callChat(
    messages: { role: string; content: string }[],
    model: string,
    temperature: number,
    maxTokens?: number,
    responseFormat?: { type: string },
  ): Promise<string | null> {
    const body: Record<string, unknown> = { model, temperature, messages };
    if (maxTokens) body.max_tokens = maxTokens;
    if (responseFormat) body.response_format = responseFormat;

    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok)
      throw new Error(
        `OpenAI API returned ${resp.status}: ${(await resp.text()).slice(0, 200)}`,
      );
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  }

  async chat(options: AIChatOptions): Promise<string | null> {
    try {
      const model = MODEL_MAP[options.size || 'medium'];
      const msgs: { role: string; content: string }[] = [];
      if (options.system) msgs.push({ role: 'system', content: options.system });
      msgs.push({ role: 'user', content: options.prompt });
      return await this.callChat(
        msgs,
        model,
        options.temperature ?? 0.7,
        options.maxTokens,
      );
    } catch (error) {
      console.error('[OpenAI] Chat failed:', error);
      return null;
    }
  }

  async embed(
    texts: string[],
    model: string = 'text-embedding-3-small',
  ): Promise<number[][] | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model, input: texts }),
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return data.data.map((d) => d.embedding);
    } catch {
      return null;
    }
  }

  async describeImage(
    _image: ArrayBuffer,
    _prompt?: string,
  ): Promise<string | null> {
    // Would need GPT-4V - not implemented for basic adapter
    return null;
  }

  async analyzeSentiment(
    _text: string,
  ): Promise<AISentimentResult | null> {
    // Would need a dedicated model - not implemented for basic adapter
    return null;
  }

  async extractStructured<T>(
    options: AIExtractOptions<T>,
  ): Promise<T | null> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const model = MODEL_MAP[options.size || 'medium'];
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = `${options.system}\n\nRespond ONLY with valid JSON matching the requested schema.`;
        const text = await this.callChat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: options.prompt },
          ],
          model,
          options.temperature ?? 0.1,
          undefined,
          { type: 'json_object' },
        );
        if (!text) throw new Error('No content returned');
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
      } catch {
        if (attempt < maxRetries) {
          await this.sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }
    }
    return null;
  }
}
