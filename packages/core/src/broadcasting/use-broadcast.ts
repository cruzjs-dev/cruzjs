/**
 * useBroadcast React Hook
 *
 * Subscribes to a broadcast channel via Server-Sent Events.
 * Automatically reconnects on disconnection with exponential backoff.
 *
 * @example
 * ```typescript
 * function OrderUpdates({ orgId }: { orgId: string }) {
 *   const { messages, lastMessage, isConnected } = useBroadcast<OrderEvent>(
 *     `org.${orgId}.orders`,
 *     'OrderCreated',
 *   );
 *
 *   return (
 *     <div>
 *       <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
 *       {messages.map((msg) => (
 *         <div key={msg.id}>{JSON.stringify(msg.data)}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BroadcastMessage, PresenceMember } from './broadcast.types';

type UseBroadcastOptions = {
  /** Whether the subscription is active (default: true) */
  enabled?: boolean;
  /** Maximum number of messages to keep in memory (default: 100) */
  maxMessages?: number;
};

type UseBroadcastResult<T> = {
  messages: BroadcastMessage<T>[];
  lastMessage: BroadcastMessage<T> | null;
  isConnected: boolean;
  presenceMembers: PresenceMember[];
};

const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 1_000;

export function useBroadcast<T = unknown>(
  channel: string,
  event?: string,
  options?: UseBroadcastOptions,
): UseBroadcastResult<T> {
  const { enabled = true, maxMessages = 100 } = options ?? {};

  const [messages, setMessages] = useState<BroadcastMessage<T>[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [presenceMembers, setPresenceMembers] = useState<PresenceMember[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !channel) {
      cleanup();
      setIsConnected(false);
      return;
    }

    const connect = () => {
      cleanup();

      const url = `/api/broadcast/sse?channel=${encodeURIComponent(channel)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        setIsConnected(true);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      });

      es.addEventListener('presence', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data.members)) {
            setPresenceMembers(data.members);
          }
        } catch {
          // Ignore malformed presence data
        }
      });

      // Listen for specific event type or all messages
      const handleMessage = (e: MessageEvent) => {
        try {
          const message = JSON.parse(e.data) as BroadcastMessage<T>;

          // If an event filter is specified, only keep matching events
          if (event && message.event !== event) {
            return;
          }

          setMessages((prev) => {
            const next = [...prev, message];
            return next.length > maxMessages ? next.slice(-maxMessages) : next;
          });
        } catch {
          // Ignore malformed messages
        }
      };

      if (event) {
        es.addEventListener(event, handleMessage);
      } else {
        es.onmessage = handleMessage;
      }

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Reconnect with exponential backoff
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return cleanup;
  }, [channel, event, enabled, maxMessages, cleanup]);

  return { messages, lastMessage, isConnected, presenceMembers };
}
