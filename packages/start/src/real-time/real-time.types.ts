import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input for querying real-time events with optional filters and cursor pagination.
 */
export const GetEventsInputSchema = z.object({
  runId: z.string().optional(),
  eventTypes: z.array(z.string()).optional(),
  after: z.string().optional(), // ISO timestamp cursor
  limit: z.number().min(1).max(200).default(50),
});
export type GetEventsInput = z.infer<typeof GetEventsInputSchema>;

/**
 * Input for polling only new events since a given timestamp.
 */
export const GetEventsSinceInputSchema = z.object({
  since: z.string(), // ISO timestamp
});
export type GetEventsSinceInput = z.infer<typeof GetEventsSinceInputSchema>;

// ============================================================================
// Event Metadata Schemas (per event type)
// ============================================================================

/**
 * Metadata for agent run events (RUN_STARTED, RUN_COMPLETED, RUN_FAILED, RUN_HANDED_OFF).
 */
export const RunEventMetaSchema = z.object({
  runId: z.string(),
  agentId: z.string().optional(),
  agentStateName: z.string().optional(),
  workItemId: z.string().optional(),
  toAgentId: z.string().optional(), // for HANDED_OFF
});
export type RunEventMeta = z.infer<typeof RunEventMetaSchema>;

/**
 * Metadata for SCM-related events (PR_STATUS_CHANGED, CI_STATUS_CHANGED, PUSH_RECEIVED).
 */
export const ScmEventMetaSchema = z.object({
  provider: z.string(),
  repoFullName: z.string(),
  prId: z.string().optional(),
  prUrl: z.string().optional(),
  prStatus: z.string().optional(),
  branchName: z.string(),
  ciStatus: z.string().optional(),
  pipelineUuid: z.string().optional(),
  commitCount: z.number().optional(),
});
export type ScmEventMeta = z.infer<typeof ScmEventMetaSchema>;

/**
 * Metadata for state transition events (STATE_TRANSITION).
 */
export const TransitionEventMetaSchema = z.object({
  fromState: z.string().nullable(),
  toState: z.string(),
  eventType: z.string(),
  runId: z.string(),
});
export type TransitionEventMeta = z.infer<typeof TransitionEventMetaSchema>;

// ============================================================================
// Output Types
// ============================================================================

export interface RealTimeEvent {
  id: string;
  orgId: string;
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GetEventsResult {
  events: RealTimeEvent[];
  nextCursor: string | null;
}
