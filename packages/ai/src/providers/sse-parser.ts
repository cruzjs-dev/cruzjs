/**
 * SSE (Server-Sent Events) Parser
 *
 * Shared utility for parsing SSE streams from AI provider APIs.
 * Used by OpenAI, Cloudflare Gateway, OpenRouter, and Anthropic providers.
 */

/**
 * Parse an SSE stream from a fetch Response into an async iterable of data lines.
 * Handles buffering of partial lines and filters out empty/comment lines.
 */
export async function* parseSSEStream(response: Response): AsyncIterable<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith(':')) {
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          yield trimmed.slice(6);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      yield buffer.trim().slice(6);
    }
  } finally {
    reader.releaseLock();
  }
}
