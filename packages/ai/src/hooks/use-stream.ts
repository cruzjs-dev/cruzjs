/**
 * useStream Hook
 *
 * React hook for consuming an AI provider's streaming response.
 * Accumulates text chunks and exposes streaming state.
 */

import { useState, useCallback } from 'react';
import type { AIMessage, ModelOptions, StreamChunk, ToolCall } from '../providers/provider.interface';

export type StreamableProvider = {
  stream(messages: AIMessage[], options?: ModelOptions): AsyncIterable<StreamChunk>;
};

export type UseStreamReturn = {
  /** Accumulated text from the stream */
  text: string;
  /** Whether the stream is currently active */
  isStreaming: boolean;
  /** Error if the stream failed */
  error: Error | null;
  /** Tool calls received during streaming */
  toolCalls: ToolCall[];
  /** Start streaming from a provider */
  stream: (
    provider: StreamableProvider,
    messages: AIMessage[],
    options?: ModelOptions,
  ) => Promise<void>;
  /** Reset all state */
  reset: () => void;
};

export function useStream(): UseStreamReturn {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const stream = useCallback(
    async (
      provider: StreamableProvider,
      messages: AIMessage[],
      options?: ModelOptions,
    ): Promise<void> => {
      setIsStreaming(true);
      setError(null);
      setText('');
      setToolCalls([]);

      try {
        for await (const chunk of provider.stream(messages, options)) {
          if (chunk.toolCall) {
            setToolCalls((prev) => [...prev, chunk.toolCall!]);
          }
          if (!chunk.done && chunk.chunk) {
            setText((t) => t + chunk.chunk);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setText('');
    setError(null);
    setIsStreaming(false);
    setToolCalls([]);
  }, []);

  return { text, isStreaming, error, toolCalls, stream, reset };
}
