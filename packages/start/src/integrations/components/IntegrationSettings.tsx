/**
 * Integration Settings Component
 *
 * Card grid for 4 integration providers: Jira, Linear, Figma, Sentry.
 * Shows connection status, last sync time, and quick actions.
 */

import React, { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

// ============================================================================
// Provider metadata
// ============================================================================

const PROVIDERS = [
  {
    id: 'JIRA' as const,
    name: 'Jira',
    description: 'One-way sync of Jira issues into work items with status mapping and periodic re-sync.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53zM6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.8v1.72a4.362 4.362 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77zM2 11.6c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7C8.13 20.06 10.1 22 12.49 22V12.44a.84.84 0 0 0-.84-.84H2z" />
      </svg>
    ),
    color: 'text-blue-400',
    syncable: true,
  },
  {
    id: 'LINEAR' as const,
    name: 'Linear',
    description: 'One-way sync of Linear issues into work items with status mapping and periodic re-sync.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.886 14.22a9.649 9.649 0 0 1-.303-1.542L12.34 21.43c-.524-.069-1.04-.17-1.543-.303L3.886 14.22zm-1.31-3.747 14.95 14.95a10.086 10.086 0 0 1-1.596-.455L2.63 11.668c-.183-.505-.338-1.025-.455-1.556L2.576 10.473zm.69-2.357L16.556 21.41c-.492-.26-.966-.553-1.42-.876L3.265 8.665a10.076 10.076 0 0 1-.878-1.42l.879-.13zm1.585-2.44L17.836 18.66a9.957 9.957 0 0 1-1.21-1.074L5.25 6.213a10.12 10.12 0 0 1-1.074-1.21l.675-.327zM14.27 2.478C18.8 4.04 22 8.27 22 13.224c0 .095-.002.19-.004.285L8.49 2.004c.095-.003.19-.004.285-.004a10.1 10.1 0 0 1 5.496 1.478v-1z" />
      </svg>
    ),
    color: 'text-purple-400',
    syncable: true,
  },
  {
    id: 'FIGMA' as const,
    name: 'Figma',
    description: 'Embed Figma design frames in work item specs with oEmbed preview thumbnails.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4zM4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4zM4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4zM12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0zM20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" />
      </svg>
    ),
    color: 'text-pink-400',
    syncable: false,
  },
  {
    id: 'SENTRY' as const,
    name: 'Sentry',
    description: 'Auto-create bug work items from Sentry error events via webhook integration.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.91 2.505c-.873-1.53-3.055-1.53-3.927 0L4.202 12.88a6.395 6.395 0 0 1 3.848 5.862H6.205a4.545 4.545 0 0 0-2.735-4.165l-1.507 2.64a1.87 1.87 0 0 0 .693.747h2.63a6.393 6.393 0 0 1 3.848 5.862H7.29a4.542 4.542 0 0 0-2.734-4.165L1.963 24h22.074L13.91 2.505z" />
      </svg>
    ),
    color: 'text-rose-400',
    syncable: false,
  },
] as const;

// ============================================================================
// Props
// ============================================================================

interface IntegrationSettingsProps {
  onConfigureProvider?: (provider: string) => void;
}

// ============================================================================
// IntegrationSettings Component
// ============================================================================

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({ onConfigureProvider }) => {
  const trpc = getTRPC();
  const { data: connections, isLoading, refetch } = trpc.integrations.listConnections.useQuery({});

  const deleteMutation = trpc.integrations.deleteConnection.useMutation({
    onSuccess: () => { refetch(); },
  });
  const syncMutation = trpc.integrations.triggerSync.useMutation({
    onSuccess: () => { refetch(); },
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Loading integrations...</div>
      </div>
    );
  }

  // Group connections by provider
  const connectionsByProvider = new Map<string, typeof connections>();
  for (const conn of connections ?? []) {
    const existing = connectionsByProvider.get(conn.provider) ?? [];
    existing.push(conn);
    connectionsByProvider.set(conn.provider, existing);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Integrations</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Connect external tools to sync data, embed designs, and ingest errors.
        </p>
      </div>

      {/* Provider cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const providerConns = connectionsByProvider.get(provider.id) ?? [];
          const hasConnection = providerConns.length > 0;
          const activeConn = providerConns.find((c: any) => c.status === 'ACTIVE');

          return (
            <div
              key={provider.id}
              className="bg-surface-light rounded-xl border border-surface-lighter p-4 space-y-3"
            >
              {/* Provider header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${provider.color}`}>
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{provider.name}</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {hasConnection ? (
                        <span className="text-green-400">Connected</span>
                      ) : (
                        <span className="text-text-muted">Not connected</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                {hasConnection && (
                  <div className={`w-2 h-2 rounded-full mt-1 ${
                    activeConn ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-text-muted leading-relaxed">
                {provider.description}
              </p>

              {/* Connection details */}
              {hasConnection && activeConn && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-muted">Connection:</span>
                    <span className="text-text-muted">{activeConn.name}</span>
                  </div>
                  {activeConn.lastSyncAt && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted">Last sync:</span>
                      <span className="text-text-muted">
                        {new Date(activeConn.lastSyncAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {activeConn.lastSyncStatus && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted">Status:</span>
                      <span className={`${
                        activeConn.lastSyncStatus === 'COMPLETED' ? 'text-green-400' :
                        activeConn.lastSyncStatus === 'FAILED' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {activeConn.lastSyncStatus}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {hasConnection ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onConfigureProvider?.(provider.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted rounded-md transition-colors text-center"
                    >
                      Configure
                    </button>
                    {provider.syncable && activeConn && (
                      <button
                        type="button"
                        onClick={() => syncMutation.mutate({ connectionId: activeConn.id })}
                        disabled={syncMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50"
                      >
                        {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                      </button>
                    )}
                    {activeConn && confirmDelete === activeConn.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteMutation.mutate({ connectionId: activeConn.id });
                            setConfirmDelete(null);
                          }}
                          className="px-2 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1.5 text-xs text-text-muted hover:text-text-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : activeConn ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(activeConn.id)}
                        className="px-2 py-1.5 text-xs text-text-muted hover:text-red-400 transition-colors"
                        title="Disconnect"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onConfigureProvider?.(provider.id)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors text-center"
                  >
                    Connect {provider.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { IntegrationSettings };
