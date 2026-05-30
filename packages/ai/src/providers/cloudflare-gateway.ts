/**
 * Cloudflare AI Gateway Provider
 *
 * Uses the Cloudflare AI Gateway's OpenAI-compatible endpoint.
 * No external SDK — raw fetch() only.
 */

import type {
  IAIProvider,
  AIMessage,
  ModelOptions,
  AIResponse,
  StreamChunk,
  ToolCall,
} from './provider.interface';
import { parseSSEStream } from './sse-parser';

export type CloudflareGatewayConfig = {
  accountId: string;
  gatewayId: string;
  apiKey: string;
  defaultModel?: string;
};

type OpenAIToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

type OpenAIChatResponse = {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
};

type OpenAIStreamDelta = {
  choices: Array<{
    delta: {
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
};

type OpenAIEmbeddingResponse = {
  data: Array<{
    embedding: number[];
  }>;
};

export class CloudflareGatewayProvider implements IAIProvider {
  readonly name = 'cloudflare-gateway';

  constructor(private readonly config: CloudflareGatewayConfig) {}

  private get baseUrl(): string {
    return `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}`;
  }

  private get chatUrl(): string {
    return `${this.baseUrl}/openai/chat/completions`;
  }

  private get embeddingsUrl(): string {
    return `${this.baseUrl}/openai/embeddings`;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  private buildMessages(messages: AIMessage[]): Array<{ role: string; content: string; tool_call_id?: string; name?: string }> {
    return messages.map((m) => {
      const msg: { role: string; content: string; tool_call_id?: string; name?: string } = {
        role: m.role,
        content: m.content,
      };
      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }
      if (m.name) {
        msg.name = m.name;
      }
      return msg;
    });
  }

  private buildTools(tools?: ModelOptions['tools']): Record<string, unknown>[] | undefined {
    if (!tools || tools === 'none') {
      return undefined;
    }
    return tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  private parseToolCalls(toolCalls?: OpenAIToolCall[]): ToolCall[] | undefined {
    if (!toolCalls || toolCalls.length === 0) {
      return undefined;
    }
    return toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));
  }

  async chat(messages: AIMessage[], options?: ModelOptions): Promise<AIResponse> {
    const body: Record<string, unknown> = {
      model: options?.model ?? this.config.defaultModel ?? 'gpt-4o-mini',
      messages: this.buildMessages(messages),
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }

    const tools = this.buildTools(options?.tools);
    if (tools) {
      body.tools = tools;
    }

    const response = await fetch(this.chatUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare Gateway returned ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const choice = data.choices[0];

    return {
      content: choice.message.content ?? '',
      toolCalls: this.parseToolCalls(choice.message.tool_calls),
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }

  async *stream(messages: AIMessage[], options?: ModelOptions): AsyncIterable<StreamChunk> {
    const body: Record<string, unknown> = {
      model: options?.model ?? this.config.defaultModel ?? 'gpt-4o-mini',
      messages: this.buildMessages(messages),
      stream: true,
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }

    const tools = this.buildTools(options?.tools);
    if (tools) {
      body.tools = tools;
    }

    const response = await fetch(this.chatUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare Gateway streaming returned ${response.status}: ${errorText.slice(0, 300)}`);
    }

    for await (const data of parseSSEStream(response)) {
      if (data === '[DONE]') {
        yield { chunk: '', done: true };
        return;
      }

      const parsed = JSON.parse(data) as OpenAIStreamDelta;
      const delta = parsed.choices[0]?.delta;

      if (delta?.content) {
        yield { chunk: delta.content, done: false };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id && tc.function?.name) {
            yield {
              chunk: '',
              done: false,
              toolCall: {
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments
                  ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
                  : {},
              },
            };
          }
        }
      }

      if (parsed.choices[0]?.finish_reason) {
        yield { chunk: '', done: true };
        return;
      }
    }

    yield { chunk: '', done: true };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.embeddingsUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare Gateway embeddings returned ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const data = (await response.json()) as OpenAIEmbeddingResponse;
    return data.data.map((d) => d.embedding);
  }
}
