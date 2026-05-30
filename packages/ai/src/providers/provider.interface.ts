/**
 * AI Provider Interface
 *
 * Defines the provider-agnostic contract for AI services.
 * All providers (OpenAI, Anthropic, Cloudflare Gateway, OpenRouter)
 * implement this interface using raw fetch() — no external SDKs.
 */

export type AIMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
};

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolResult = {
  toolCallId: string;
  content: string;
};

export type StreamChunk = {
  chunk: string;
  done: boolean;
  toolCall?: ToolCall;
};

export type ModelOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDef[] | 'none';
  maxToolRounds?: number;
};

export type AIResponse = {
  content: string;
  toolCalls?: ToolCall[];
  inputTokens?: number;
  outputTokens?: number;
};

export interface IAIProvider {
  readonly name: string;
  chat(messages: AIMessage[], options?: ModelOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options?: ModelOptions): AsyncIterable<StreamChunk>;
  embed(texts: string[]): Promise<number[][]>;
}
