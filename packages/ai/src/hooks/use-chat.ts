/**
 * useChat Hook
 *
 * Multi-turn conversation hook that manages message history
 * and streams AI responses. Builds on useStream internally.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIMessage, ModelOptions } from '../providers/provider.interface';
import { useStream } from './use-stream';
import type { StreamableProvider } from './use-stream';

export type UseChatOptions = {
  /** Initial system message */
  systemMessage?: string;
  /** AI provider to use */
  provider: StreamableProvider;
  /** Default model options */
  defaultOptions?: ModelOptions;
};

export type UseChatReturn = {
  /** Full conversation history */
  messages: AIMessage[];
  /** Current streaming text (empty when not streaming) */
  streamingText: string;
  /** Whether a response is being streamed */
  isStreaming: boolean;
  /** Error if the last send failed */
  error: Error | null;
  /** Send a user message and stream the response */
  send: (content: string, options?: ModelOptions) => Promise<void>;
  /** Reset the conversation */
  reset: () => void;
};

export function useChat({ systemMessage, provider, defaultOptions }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    if (systemMessage) {
      return [{ role: 'system', content: systemMessage }];
    }
    return [];
  });

  const { text: streamingText, isStreaming, error, stream, reset: resetStream } = useStream();
  const prevStreamingRef = useRef(isStreaming);
  const lastStreamTextRef = useRef('');

  // Track the latest streaming text
  useEffect(() => {
    if (streamingText) {
      lastStreamTextRef.current = streamingText;
    }
  }, [streamingText]);

  // When streaming ends, append the assistant's full response to the message history
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && lastStreamTextRef.current) {
      const finalText = lastStreamTextRef.current;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: finalText },
      ]);
      lastStreamTextRef.current = '';
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const send = useCallback(
    async (content: string, options?: ModelOptions): Promise<void> => {
      const userMessage: AIMessage = { role: 'user', content };

      // Append user message first
      setMessages((prev) => [...prev, userMessage]);

      // Build the full conversation including the new message
      // We read from state indirectly via a setter to avoid stale closures
      const currentMessages = await new Promise<AIMessage[]>((resolve) => {
        setMessages((prev) => {
          resolve(prev);
          return prev;
        });
      });

      const mergedOptions = { ...defaultOptions, ...options };
      await stream(provider, currentMessages, mergedOptions);
    },
    [provider, defaultOptions, stream],
  );

  const reset = useCallback(() => {
    resetStream();
    lastStreamTextRef.current = '';
    setMessages(
      systemMessage ? [{ role: 'system', content: systemMessage }] : [],
    );
  }, [systemMessage, resetStream]);

  return { messages, streamingText, isStreaming, error, send, reset };
}
