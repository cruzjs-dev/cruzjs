/**
 * Anthropic Provider
 *
 * Direct integration with the Anthropic Messages API.
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

export type AnthropicConfig = {
  apiKey: string;
  defaultModel?: string;
};

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } | { type: 'tool_result'; tool_use_id: string; content: string }>;
};

type AnthropicToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

type AnthropicStreamEvent = {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: AnthropicContentBlock;
};

export class AnthropicProvider implements IAIProvider {
  readonly name = 'anthropic';

  private static readonly API_URL = 'https://api.anthropic.com/v1/messages';
  private static readonly API_VERSION = '2023-06-01';

  constructor(private readonly config: AnthropicConfig) {}

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': AnthropicProvider.API_VERSION,
    };
  }

  /**
   * Convert our unified AIMessage format to Anthropic's message format.
   * Anthropic requires a separate `system` parameter and only allows user/assistant roles.
   */
  private convertMessages(messages: AIMessage[]): { system?: string; messages: AnthropicMessage[] } {
    let system: string | undefined;
    const converted: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
        continue;
      }

      if (msg.role === 'tool') {
        // Anthropic represents tool results as user messages with tool_result content
        converted.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId ?? '',
              content: msg.content,
            },
          ],
        });
        continue;
      }

      converted.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    return { system, messages: converted };
  }

  private buildTools(tools?: ModelOptions['tools']): AnthropicToolDef[] | undefined {
    if (!tools || tools === 'none') {
      return undefined;
    }
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  private extractToolCalls(content: AnthropicContentBlock[]): ToolCall[] | undefined {
    const toolUses = content.filter(
      (block): block is Extract<AnthropicContentBlock, { type: 'tool_use' }> =>
        block.type === 'tool_use'
    );

    if (toolUses.length === 0) {
      return undefined;
    }

    return toolUses.map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.input,
    }));
  }

  async chat(messages: AIMessage[], options?: ModelOptions): Promise<AIResponse> {
    const { system, messages: anthropicMessages } = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      model: options?.model ?? this.config.defaultModel ?? 'claude-sonnet-4-20250514',
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 4096,
    };

    if (system) {
      body.system = system;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const tools = this.buildTools(options?.tools);
    if (tools) {
      body.tools = tools;
    }

    const response = await fetch(AnthropicProvider.API_URL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic returned ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    const textContent = data.content
      .filter((block): block is Extract<AnthropicContentBlock, { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content: textContent,
      toolCalls: this.extractToolCalls(data.content),
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    };
  }

  async *stream(messages: AIMessage[], options?: ModelOptions): AsyncIterable<StreamChunk> {
    const { system, messages: anthropicMessages } = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      model: options?.model ?? this.config.defaultModel ?? 'claude-sonnet-4-20250514',
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    };

    if (system) {
      body.system = system;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const tools = this.buildTools(options?.tools);
    if (tools) {
      body.tools = tools;
    }

    const response = await fetch(AnthropicProvider.API_URL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic streaming returned ${response.status}: ${errorText.slice(0, 300)}`);
    }

    // Track current tool use for assembling streaming tool calls
    let currentToolUse: { id: string; name: string; jsonArgs: string } | null = null;

    for await (const data of parseSSEStream(response)) {
      const event = JSON.parse(data) as AnthropicStreamEvent;

      switch (event.type) {
        case 'content_block_start': {
          if (event.content_block?.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              jsonArgs: '',
            };
          }
          break;
        }

        case 'content_block_delta': {
          if (event.delta?.type === 'text_delta' && event.delta.text) {
            yield { chunk: event.delta.text, done: false };
          }
          if (event.delta?.type === 'input_json_delta' && event.delta.partial_json && currentToolUse) {
            currentToolUse.jsonArgs += event.delta.partial_json;
          }
          break;
        }

        case 'content_block_stop': {
          if (currentToolUse) {
            yield {
              chunk: '',
              done: false,
              toolCall: {
                id: currentToolUse.id,
                name: currentToolUse.name,
                arguments: currentToolUse.jsonArgs
                  ? (JSON.parse(currentToolUse.jsonArgs) as Record<string, unknown>)
                  : {},
              },
            };
            currentToolUse = null;
          }
          break;
        }

        case 'message_stop': {
          yield { chunk: '', done: true };
          return;
        }
      }
    }

    yield { chunk: '', done: true };
  }

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error(
      'Anthropic does not support embeddings. Use OpenAI or Cloudflare Gateway for embeddings.'
    );
  }
}
