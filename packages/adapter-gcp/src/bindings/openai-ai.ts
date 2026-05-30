import type {
  AIBinding,
  AIChatOptions,
  AISentimentResult,
  AIExtractOptions,
} from '@cruzjs/core/runtime';

const MODEL_MAP = {
  small: 'gemini-2.0-flash-lite',
  medium: 'gemini-2.0-flash',
  large: 'gemini-2.5-pro',
} as const;

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class OpenAICompatibleAIBinding implements AIBinding {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1',
  ) {}

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

    if (!resp.ok) {
      throw new Error(
        `API returned ${resp.status}: ${(await resp.text()).slice(0, 200)}`,
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
      console.error('[GCP AI] Chat failed:', error);
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
    return null;
  }

  async analyzeSentiment(
    _text: string,
  ): Promise<AISentimentResult | null> {
    return null;
  }

  async extractStructured<T>(
    options: AIExtractOptions<T>,
  ): Promise<T | null> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const model = MODEL_MAP[options.size || 'medium'];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = `${options.system}\n\nRespond ONLY with valid JSON.`;
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

        const validated = options.schema.safeParse(JSON.parse(text));
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
