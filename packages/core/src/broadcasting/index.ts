/**
 * @cruzjs/core Broadcasting
 *
 * Real-time event broadcasting with SSE, channel authorization,
 * and presence tracking. Provider-agnostic adapter pattern.
 */

// Types
export type {
  ChannelType,
  BroadcastMessage,
  PresenceMember,
  BroadcastSubscription,
} from './broadcast.types';

// Adapter interface
export type { BroadcastAdapter } from './broadcast.adapter';

// Channel classes
export {
  BroadcastChannel,
  PublicChannel,
  PrivateChannel,
  PresenceChannel,
  channel,
  privateChannel,
  presenceChannel,
} from './broadcast.channel';

// Event base class
export { BroadcastEvent } from './broadcast.event';

// Service
export { BroadcastService, BROADCAST_ADAPTER } from './broadcast.service';

// Auth
export { BroadcastAuthService } from './broadcast.middleware';
export type { ChannelAuthHandler } from './broadcast.middleware';

// SSE Backend (new adapter pattern)
export type { SSEBackend, SSEController } from './sse-backend';
export { SSE_BACKEND, InMemorySSEBackend, defaultSSEBackend } from './sse-backend';

// SSE Backend implementations
export { KVSSEBackend } from './backends/kv.sse-backend';
export { DatabaseSSEBackend } from './backends/database.sse-backend';

// SSE Handler
export { createSSEResponse } from './sse-handler';

// Backward-compatible aliases (SSEConnectionRegistry = InMemorySSEBackend, sseRegistry = defaultSSEBackend)
export { SSEConnectionRegistry, sseRegistry } from './sse-handler';

// tRPC Router
export { BroadcastTrpc } from './broadcast.trpc';

// Module
export { BroadcastModule } from './broadcast.module';

// Schema
export { broadcastPresence, broadcastMessages } from './broadcast.schema';
export type {
  BroadcastPresenceRecord,
  NewBroadcastPresenceRecord,
  BroadcastMessageRecord,
  NewBroadcastMessageRecord,
} from './broadcast.schema';

// Validation
export {
  channelAuthSchema,
  presenceChannelSchema,
  joinPresenceSchema,
  leavePresenceSchema,
} from './broadcast.validation';
export type {
  ChannelAuthInput,
  PresenceChannelInput,
  JoinPresenceInput,
  LeavePresenceInput,
} from './broadcast.validation';
