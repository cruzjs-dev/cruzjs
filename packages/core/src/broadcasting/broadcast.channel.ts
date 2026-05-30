/**
 * Broadcast Channel Types
 *
 * Channel classes representing different access levels:
 * - PublicChannel: anyone can subscribe
 * - PrivateChannel: requires authorization
 * - PresenceChannel: tracks connected members
 */

import type { ChannelType } from './broadcast.types';

export abstract class BroadcastChannel {
  abstract readonly type: ChannelType;
  constructor(readonly name: string) {}
}

export class PublicChannel extends BroadcastChannel {
  readonly type: ChannelType = 'public';
}

export class PrivateChannel extends BroadcastChannel {
  readonly type: ChannelType = 'private';
}

export class PresenceChannel extends BroadcastChannel {
  readonly type: ChannelType = 'presence';
}

/** Create a public channel */
export const channel = (name: string) => new PublicChannel(name);

/** Create a private channel (requires auth) */
export const privateChannel = (name: string) => new PrivateChannel(name);

/** Create a presence channel (tracks members) */
export const presenceChannel = (name: string) => new PresenceChannel(name);
