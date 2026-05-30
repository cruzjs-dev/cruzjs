/**
 * Broadcast Validation Schemas
 */

import { z } from 'zod';

export const channelAuthSchema = z.object({
  channel: z.string().min(1).max(256),
  socketId: z.string().optional(),
});

export const presenceChannelSchema = z.object({
  channel: z.string().min(1).max(256),
});

export const joinPresenceSchema = z.object({
  channel: z.string().min(1).max(256),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const leavePresenceSchema = z.object({
  channel: z.string().min(1).max(256),
});

export type ChannelAuthInput = z.infer<typeof channelAuthSchema>;
export type PresenceChannelInput = z.infer<typeof presenceChannelSchema>;
export type JoinPresenceInput = z.infer<typeof joinPresenceSchema>;
export type LeavePresenceInput = z.infer<typeof leavePresenceSchema>;
