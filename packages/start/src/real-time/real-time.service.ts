import { Injectable } from '@cruzjs/core/di';
import type { GetEventsInput, RealTimeEvent, GetEventsResult } from './real-time.types';

/**
 * RealTimeService
 *
 * Writes and queries real-time stream events.
 *
 * Note: AgentStreamEvent table removed as part of state-machine overhaul.
 * Events are currently logged to console and returned as empty results.
 * Future: use WorkItemRun status changes for real-time streaming.
 */
@Injectable()
export class RealTimeService {
  /**
   * Write a real-time event. Currently logs to console.
   */
  async writeEvent(input: {
    orgId: string;
    eventType: string;
    summary: string;
    metadata?: Record<string, unknown>;
    agentId?: string;
    agentName?: string;
    runId?: string;
  }): Promise<void> {
    console.log(`[RealTime] ${input.eventType} [org=${input.orgId}]: ${input.summary}`, input.metadata ?? {});
  }

  /**
   * Query events (stub — returns empty until streaming infrastructure is rebuilt).
   */
  async getEvents(_orgId: string, _input: GetEventsInput): Promise<GetEventsResult> {
    return { events: [], nextCursor: null };
  }

  /**
   * Get events since a given ISO timestamp.
   */
  async getEventsSince(orgId: string, _since: string): Promise<GetEventsResult> {
    return this.getEvents(orgId, { limit: 50 });
  }
}
