import type { AIBinding, AIChatOptions, AISentimentResult, AIExtractOptions } from '@cruzjs/core/runtime';

const MODEL_MAP = { small: 'gpt-4o-mini', medium: 'gpt-4o', large: 'gpt-4o' } as const;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class OpenAICompatibleAIBinding implements AIBinding {
  constructor(private apiKey: string, private baseUrl: string = 'https://api.openai.com/v1') {}
  private sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
  private async callChat(messages: { role: string; content: string }[], model: string, temperature: number, maxTokens?: number, responseFormat?: { type: string }): Promise<string | null> {
    const body: Record<string, unknown> = { model, temperature, messages };
    if (maxTokens) body.max_tokens = maxTokens;
    if (responseFormat) body.response_format = responseFormat;
    const resp = await fetch(`${this.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  }
  async chat(options: AIChatOptions): Promise<string | null> {
    try {
      const msgs: { role: string; content: string }[] = [];
      if (options.system) msgs.push({ role: 'system', content: options.system });
      msgs.push({ role: 'user', content: options.prompt });
      return await this.callChat(msgs, MODEL_MAP[options.size || 'medium'], options.temperature ?? 0.7, options.maxTokens);
    } catch (e) { console.error('[Docker AI] Chat failed:', e); return null; }
  }
  async embed(texts: string[], model: string = 'text-embedding-3-small'): Promise<number[][] | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/embeddings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` }, body: JSON.stringify({ model, input: texts }) });
      if (!resp.ok) return null;
      const data = await resp.json() as { data: Array<{ embedding: number[] }> };
      return data.data.map(d => d.embedding);
    } catch { return null; }
  }
  async describeImage(): Promise<string | null> { return null; }
  async analyzeSentiment(): Promise<AISentimentResult | null> { return null; }
  async extractStructured<T>(options: AIExtractOptions<T>): Promise<T | null> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    for (let a = 1; a <= maxRetries; a++) {
      try {
        const text = await this.callChat([{ role: 'system', content: `${options.system}\n\nRespond ONLY with valid JSON.` }, { role: 'user', content: options.prompt }], MODEL_MAP[options.size || 'medium'], options.temperature ?? 0.1, undefined, { type: 'json_object' });
        if (!text) throw new Error('No content');
        const v = options.schema.safeParse(JSON.parse(text));
        if (!v.success) { if (a < maxRetries) { await this.sleep(RETRY_DELAY_MS * a); continue; } return null; }
        return v.data!;
      } catch { if (a < maxRetries) { await this.sleep(RETRY_DELAY_MS * a); continue; } }
    }
    return null;
  }
}
