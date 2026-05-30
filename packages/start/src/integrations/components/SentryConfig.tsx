/**
 * Sentry Configuration Component
 *
 * Webhook setup instructions, auto-create settings, and connection management
 * for Sentry error ingestion integration.
 */

import React, { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

// ============================================================================
// Props
// ============================================================================

interface SentryConfigProps {
  connectionId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// SentryConfig Component
// ============================================================================

const SentryConfig: React.FC<SentryConfigProps> = ({ connectionId, onSave, onCancel }) => {
  const trpc = getTRPC();
  const [name, setName] = useState('Sentry Integration');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [targetProjectId, setTargetProjectId] = useState('');
  const [autoCreateBugs, setAutoCreateBugs] = useState(true);
  const [minLevel, setMinLevel] = useState('error');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing connection if editing
  const { data: existingConn } = trpc.integrations.getConnection.useQuery(
    { connectionId: connectionId ?? '' },
    { enabled: !!connectionId },
  );

  React.useEffect(() => {
    if (existingConn?.config && existingConn.config.provider === 'SENTRY') {
      const cfg = existingConn.config;
      setName(existingConn.name);
      setOrganizationSlug(cfg.organizationSlug);
      setProjectSlug(cfg.projectSlug ?? '');
      setWebhookSecret(cfg.webhookSecret);
      setTargetProjectId(cfg.targetProjectId);
      setAutoCreateBugs(cfg.autoCreateBugs);
      setMinLevel(cfg.minLevel);
    }
  }, [existingConn]);

  // Sync history (shows webhook processing history)
  const { data: syncHistory } = trpc.integrations.getSyncHistory.useQuery(
    { connectionId: connectionId ?? '', limit: 10 },
    { enabled: !!connectionId },
  );

  const testMutation = trpc.integrations.testConnection.useMutation({
    onSuccess: (result: any) => setTestResult(result),
  });

  const createMutation = trpc.integrations.createConnection.useMutation({
    onSuccess: () => onSave?.(),
  });

  const updateMutation = trpc.integrations.updateConnection.useMutation({
    onSuccess: () => onSave?.(),
  });

  const handleTest = () => {
    setTestResult(null);
    testMutation.mutate({
      provider: 'SENTRY',
      organizationSlug,
      projectSlug: projectSlug || undefined,
      webhookSecret,
      targetProjectId,
      autoCreateBugs,
      minLevel,
    });
  };

  const handleSave = () => {
    const config = {
      provider: 'SENTRY' as const,
      organizationSlug,
      projectSlug: projectSlug || undefined,
      webhookSecret,
      targetProjectId,
      autoCreateBugs,
      minLevel,
    };

    if (connectionId) {
      updateMutation.mutate({
        connectionId,
        name,
        config,
      });
    } else {
      createMutation.mutate({
        provider: 'SENTRY',
        name,
        config,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection name */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Connection Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Sentry Integration"
        />
      </div>

      {/* Sentry connection fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Sentry Organization Slug</label>
          <input
            type="text"
            value={organizationSlug}
            onChange={(e) => setOrganizationSlug(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="my-org"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Project Slug <span className="text-text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={projectSlug}
            onChange={(e) => setProjectSlug(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="my-project"
          />
        </div>
      </div>

      {/* Webhook secret */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Webhook Signing Secret</label>
        <input
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Client secret from Sentry Internal Integration"
        />
        <p className="text-[10px] text-text-muted mt-1">
          Found in Sentry &gt; Settings &gt; Developer Settings &gt; Internal Integration &gt; Client Secret
        </p>
      </div>

      {/* Target project */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Target Project ID</label>
        <input
          type="text"
          value={targetProjectId}
          onChange={(e) => setTargetProjectId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Project ID for auto-created bug items"
        />
      </div>

      {/* Auto-create settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoCreateBugs(!autoCreateBugs)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              autoCreateBugs ? 'bg-blue-600' : 'bg-surface-lighter'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                autoCreateBugs ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <div>
            <p className="text-xs text-text-muted">Auto-create bug work items</p>
            <p className="text-[10px] text-text-muted">
              Automatically create BUG work items when new Sentry issues arrive
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Minimum Error Level</label>
          <select
            value={minLevel}
            onChange={(e) => setMinLevel(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="debug">Debug (all events)</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error (recommended)</option>
            <option value="fatal">Fatal only</option>
          </select>
          <p className="text-[10px] text-text-muted mt-1">
            Only events at or above this level will create work items.
          </p>
        </div>
      </div>

      {/* Webhook setup instructions */}
      <div className="bg-surface-lighter/30 rounded-lg border border-surface-lighter p-4 space-y-2">
        <h4 className="text-xs font-medium text-text-muted">Webhook Setup Instructions</h4>
        <ol className="text-[10px] text-text-muted space-y-1.5 list-decimal list-inside">
          <li>Go to Sentry &gt; Settings &gt; Developer Settings</li>
          <li>Create an Internal Integration</li>
          <li>Under Webhooks, enable "Issue" events</li>
          <li>Set the Webhook URL to your app's Sentry webhook endpoint</li>
          <li>Copy the Client Secret into the field above</li>
          <li>Save the integration in both Sentry and your app</li>
        </ol>
        {connectionId && (
          <div className="pt-2 mt-2 border-t border-surface-lighter/50">
            <p className="text-[10px] text-text-muted">
              Connection ID: <code className="text-text-muted">{connectionId}</code>
            </p>
          </div>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`px-3 py-2 rounded-md text-xs ${
          testResult.success
            ? 'bg-green-900/20 border border-green-800/30 text-green-400'
            : 'bg-red-900/20 border border-red-800/30 text-red-400'
        }`}>
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-surface-lighter">
        <button
          type="button"
          onClick={handleTest}
          disabled={testMutation.isPending || !organizationSlug || !webhookSecret || !targetProjectId}
          className="px-4 py-2 text-xs font-medium bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted rounded-md transition-colors disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testing...' : 'Validate Config'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending || !organizationSlug || !webhookSecret || !targetProjectId}
          className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : connectionId ? 'Update' : 'Save'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs text-text-muted hover:text-text-muted transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Webhook processing history */}
      {connectionId && syncHistory && syncHistory.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-muted mb-2">Webhook Processing History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-text-muted border-b border-surface-lighter">
                  <th className="text-left py-1.5 px-2">Time</th>
                  <th className="text-left py-1.5 px-2">Status</th>
                  <th className="text-right py-1.5 px-2">Created</th>
                  <th className="text-left py-1.5 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-surface-lighter/50">
                    <td className="py-1.5 px-2 text-text-muted">
                      {new Date(entry.startedAt).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`${
                        entry.status === 'COMPLETED' ? 'text-green-400' :
                        entry.status === 'FAILED' ? 'text-red-400' :
                        'text-text-muted'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-text-muted">{entry.itemsSynced}</td>
                    <td className="py-1.5 px-2 text-red-400 truncate max-w-[200px]">
                      {entry.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export { SentryConfig };
