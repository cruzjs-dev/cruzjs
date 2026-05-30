/**
 * OpenRouter Provider
 *
 * OpenAI-compatible API via OpenRouter (https://openrouter.ai).
 * Supports 100+ models from multiple providers.
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

export type OpenRouterConfig = {
  apiKey: string;
  defaultModel?: string;
  siteUrl?: string;
  siteName?: string;
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

export class OpenRouterProvider implements IAIProvider {
  readonly name = 'openrouter';

  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';

  constructor(private readonly config: OpenRouterConfig) {}

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
    if (this.config.siteUrl) {
      headers['HTTP-Referer'] = this.config.siteUrl;
    }
    if (this.config.siteName) {
      headers['X-Title'] = this.config.siteName;
    }
    return headers;
  }

  private buildMessages(messages: AIMessage[]): Array<Record<string, string>> {
    return messages.map((m) => {
      const msg: Record<string, string> = {
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
      model: options?.model ?? this.config.defaultModel ?? 'openai/gpt-4o-mini',
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

    const response = await fetch(`${OpenRouterProvider.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter returned ${response.status}: ${errorText.slice(0, 300)}`);
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
      model: options?.model ?? this.config.defaultModel ?? 'openai/gpt-4o-mini',
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

    const response = await fetch(`${OpenRouterProvider.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter streaming returned ${response.status}: ${errorText.slice(0, 300)}`);
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

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error(
      'OpenRouter does not support embeddings. Use OpenAI or Cloudflare Gateway for embeddings.'
    );
  }
}
