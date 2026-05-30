import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

// ============================================================================
// Event Type Config
// ============================================================================

export type EventTypeConfig = Record<string, { icon: string; color: string; bgColor: string; label: string }>;
export type EventCategories = Record<string, string[]>;

const DEFAULT_EVENT_CONFIG: EventTypeConfig = {};

const ICON_PATHS: Record<string, string> = {
  'check-circle': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'x-circle': 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  'git-pr': 'M18 15a3 3 0 100 6 3 3 0 000-6zm0 0V9a3 3 0 00-3-3h-3m0 0l3-3m-3 3l3 3M6 9a3 3 0 100-6 3 3 0 000 6zm0 0v12',
  'arrow-right': 'M14 5l7 7m0 0l-7 7m7-7H3',
  'arrow-up': 'M5 10l7-7m0 0l7 7m-7-7v18',
  play: 'M5 3l14 9-14 9V3z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function getEventConfig(eventType: string, config: EventTypeConfig) {
  return config[eventType] ?? {
    icon: 'info',
    color: 'text-text-muted',
    bgColor: 'bg-text-muted/20',
    label: eventType.replace(/_/g, ' '),
  };
}

function renderIcon(iconName: string, colorClass: string, bgClass: string) {
  const path = ICON_PATHS[iconName] ?? ICON_PATHS.info;
  return (
    <div className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0`}>
      <svg className={`w-4 h-4 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
      </svg>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const DEFAULT_EVENT_CATEGORIES: EventCategories = {
  'All events': [],
};

// ============================================================================
// Component
// ============================================================================

interface LiveEventFeedProps {
  orgId: string;
  runId?: string;
  eventTypes?: string[];
  maxHeight?: string;
  eventConfig?: EventTypeConfig;
  eventCategories?: EventCategories;
}

interface StreamEvent {
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

/**
 * LiveEventFeed - Real-time unified event feed with 5s polling.
 *
 * Features:
 * - 5-second polling interval (paused when document not visible)
 * - Event category filter dropdown
 * - Type-specific icons, colors, and badges
 * - Expandable metadata on each event
 * - "Load more" button for cursor-based pagination
 * - Auto-scroll toggle for following new events
 */
export const LiveEventFeed: React.FC<LiveEventFeedProps> = ({
  runId,
  eventTypes: propEventTypes,
  maxHeight = '600px',
  eventConfig = DEFAULT_EVENT_CONFIG,
  eventCategories = DEFAULT_EVENT_CATEGORIES,
}) => {
  const [category, setCategory] = useState<string>('All events');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const [followNew, setFollowNew] = useState(true);
  const [olderEvents, setOlderEvents] = useState<StreamEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trpc = getTRPC();

  // Track document visibility for polling pause
  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Determine effective event types from category or props
  const effectiveEventTypes = propEventTypes
    ?? (eventCategories[category]?.length ? eventCategories[category] : undefined);

  // Reset older events when filter changes
  useEffect(() => {
    setOlderEvents([]);
    setNextCursor(null);
  }, [category, runId]);

  // Main query with 5s polling
  const { data, isLoading } = trpc.realTime.getEvents.useQuery(
    {
      ...(runId ? { runId } : {}),
      ...(effectiveEventTypes ? { eventTypes: effectiveEventTypes } : {}),
      limit: 50,
    },
    {
      refetchInterval: isVisible ? 5000 : false,
    }
  );

  const utils = trpc.useUtils();

  // Auto-scroll to top when new events arrive and follow is on
  const prevFirstId = useRef<string | null>(null);
  useEffect(() => {
    const firstId = data?.events?.[0]?.id ?? null;
    if (followNew && firstId && firstId !== prevFirstId.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevFirstId.current = firstId;
  }, [data?.events, followNew]);

  // Load more handler
  const handleLoadMore = useCallback(async () => {
    const cursor = nextCursor ?? data?.nextCursor;
    if (!cursor) return;

    setIsLoadingMore(true);
    try {
      const result = await utils.realTime.getEvents.fetch({
        ...(runId ? { runId } : {}),
        ...(effectiveEventTypes ? { eventTypes: effectiveEventTypes } : {}),
        limit: 50,
        after: cursor,
      });

      setOlderEvents((prev) => [...prev, ...result.events]);
      setNextCursor(result.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, data?.nextCursor, runId, effectiveEventTypes, utils]);

  // Combine and deduplicate
  const liveEvents = data?.events ?? [];
  const allEvents = [...liveEvents, ...olderEvents];
  const seenIds = new Set<string>();
  const deduped = allEvents.filter((e) => {
    if (seenIds.has(e.id)) return false;
    seenIds.add(e.id);
    return true;
  });

  const hasMore = nextCursor ?? data?.nextCursor;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Header with filter and live indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Live Events</h3>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-lighter/50 border border-surface-lighter rounded text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.keys(eventCategories).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {isVisible && (
            <span className="flex items-center gap-1.5 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFollowNew(!followNew)}
          className={`px-2 py-1 text-[10px] rounded border transition-colors ${
            followNew
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-surface-lighter/50 border-surface-lighter text-text-muted'
          }`}
        >
          {followNew ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Event Feed */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-text-muted">Loading events...</div>
          </div>
        ) : deduped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-10 h-10 text-text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-sm text-text-muted mb-1">No events yet</p>
            <p className="text-xs text-text-muted">Run lifecycle and SCM updates will appear here.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-surface-lighter" />

            <div className="space-y-2">
              {deduped.map((event) => {
                const cfg = getEventConfig(event.eventType, eventConfig);
                const isExpanded = expandedIds.has(event.id);
                const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

                return (
                  <div key={event.id} className="relative flex gap-3 pl-0">
                    {/* Icon */}
                    <div className="relative z-10">
                      {renderIcon(cfg.icon, cfg.color, cfg.bgColor)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <button
                        type="button"
                        onClick={() => hasMetadata && toggleExpand(event.id)}
                        className={`w-full text-left p-3 bg-surface-light rounded-lg border border-surface-lighter ${
                          hasMetadata ? 'hover:border-blue-500/30 cursor-pointer' : ''
                        } transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-white">{event.summary}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 ${cfg.bgColor} ${cfg.color} rounded font-medium`}>
                                {cfg.label}
                              </span>
                              {event.agentName && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                                  {event.agentName}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-text-muted flex-shrink-0 whitespace-nowrap">
                            {timeAgo(event.createdAt)}
                          </span>
                        </div>

                        {/* Expanded metadata */}
                        {isExpanded && hasMetadata && (
                          <pre className="mt-2 p-2 text-[10px] bg-surface-lighter/30 rounded text-text-muted overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-xs font-medium bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted rounded transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
