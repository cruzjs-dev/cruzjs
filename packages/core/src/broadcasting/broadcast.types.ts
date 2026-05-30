/**
 * Broadcasting Types
 *
 * Core types for the CruzJS broadcasting / real-time system.
 */

export type ChannelType = 'public' | 'private' | 'presence';

export type BroadcastMessage<T = unknown> = {
  id: string;
  channel: string;
  event: string;
  data: T;
  timestamp: string;
};

export type PresenceMember = {
  userId: string;
  metadata?: Record<string, unknown>;
  joinedAt: string;
};

export type BroadcastSubscription = {
  unsubscribe: () => void;
};
