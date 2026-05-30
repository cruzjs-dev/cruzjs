import React, { useCallback, useMemo } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

/**
 * Notification event types available for preference control.
 */
const EVENT_TYPES = [
  { value: 'GATE_REVIEW_REQUESTED', label: 'Gate Review Requested', description: 'When a gate requires your review' },
  { value: 'GATE_ACTION_TAKEN', label: 'Gate Action Taken', description: 'When someone acts on a gate' },
  { value: 'PR_STATUS_CHANGED', label: 'PR Status Changed', description: 'When a pull request status changes' },
  { value: 'CI_STATUS_CHANGED', label: 'CI Status Changed', description: 'When CI/CD pipeline status changes' },
  { value: 'EXECUTION_COMPLETED', label: 'Execution Completed', description: 'When a pipeline execution completes' },
] as const;

/**
 * Notification channels available for preference control.
 */
const CHANNELS = [
  { value: 'IN_APP', label: 'In-App' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SLACK', label: 'Slack' },
] as const;

/**
 * NotificationPreferences
 *
 * Matrix table (event types x channels) with toggle switches.
 * Uses opt-out model: all notifications enabled by default.
 * Only disabled preferences are stored in the database.
 */
export const NotificationPreferences: React.FC = () => {
  const trpc = getTRPC();
  const { data: preferences, isLoading } = trpc.notification.getPreferences.useQuery();
  const utils = trpc.useUtils();

  const updateMutation = trpc.notification.updatePreference.useMutation({
    onSuccess: () => {
      utils.notification.getPreferences.invalidate();
    },
  });

  // Build a map of disabled preferences for quick lookup
  const disabledMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (preferences) {
      for (const pref of preferences) {
        if (!pref.enabled) {
          map.set(`${pref.eventType}:${pref.channel}`, true);
        }
      }
    }
    return map;
  }, [preferences]);

  const isEnabled = useCallback(
    (eventType: string, channel: string) => {
      return !disabledMap.has(`${eventType}:${channel}`);
    },
    [disabledMap]
  );

  const handleToggle = useCallback(
    (eventType: string, channel: string) => {
      const currentEnabled = isEnabled(eventType, channel);
      updateMutation.mutate({
        eventType: eventType as any,
        channel: channel as any,
        enabled: !currentEnabled,
      });
    },
    [isEnabled, updateMutation]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-strong mb-1">
            Notification Preferences
          </h2>
          <p className="text-sm text-text-muted">
            Control which notifications you receive per channel.
            All notifications are enabled by default (opt-out model).
          </p>
        </div>

        <div className="border border-surface-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-light">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted border-b border-surface-border w-[40%]">
                  Event Type
                </th>
                {CHANNELS.map((channel) => (
                  <th
                    key={channel.value}
                    className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted border-b border-surface-border"
                  >
                    {channel.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map((eventType) => (
                <tr key={eventType.value} className="hover:bg-surface-light transition-colors">
                  <td className="py-3 px-4 border-b border-surface-border">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-strong">
                        {eventType.label}
                      </span>
                      <span className="text-xs text-text-muted">
                        {eventType.description}
                      </span>
                    </div>
                  </td>
                  {CHANNELS.map((channel) => {
                    const enabled = isEnabled(eventType.value, channel.value);
                    const isPending =
                      updateMutation.isPending &&
                      updateMutation.variables?.eventType === eventType.value &&
                      updateMutation.variables?.channel === channel.value;

                    return (
                      <td
                        key={channel.value}
                        className="text-center py-3 px-4 border-b border-surface-border"
                      >
                        <div className="flex justify-center">
                          <button
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => handleToggle(eventType.value, channel.value)}
                            disabled={isPending}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                              enabled ? 'bg-primary' : 'bg-surface-border'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                                enabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-primary-subtle text-primary">
            Opt-out model
          </span>
          <span className="text-xs text-text-muted">
            Toggle off to stop receiving specific notification types on specific channels.
          </span>
        </div>
      </div>
    </div>
  );
};
