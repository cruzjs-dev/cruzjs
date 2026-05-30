/**
 * Jira Sync Configuration Component
 *
 * Connection setup, status mapping editor, sync schedule selector,
 * and sync history table for Jira one-way pull integration.
 */

import React, { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

// ============================================================================
// App status options for mapping
// ============================================================================

const APP_STATUSES = [
  'BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED',
];

const SCHEDULE_OPTIONS = [
  { value: 'manual', label: 'Manual only' },
  { value: '15m', label: 'Every 15 minutes' },
  { value: '1h', label: 'Every hour' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '24h', label: 'Daily' },
];

// ============================================================================
// Props
// ============================================================================

interface JiraSyncConfigProps {
  connectionId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// JiraSyncConfig Component
// ============================================================================

const JiraSyncConfig: React.FC<JiraSyncConfigProps> = ({ connectionId, onSave, onCancel }) => {
  const trpc = getTRPC();
  const [name, setName] = useState('Jira Integration');
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [jql, setJql] = useState('');
  const [targetProjectId, setTargetProjectId] = useState('');
  const [syncSchedule, setSyncSchedule] = useState('manual');
  const [statusMapping, setStatusMapping] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing connection if editing
  const { data: existingConn } = trpc.integrations.getConnection.useQuery(
    { connectionId: connectionId ?? '' },
    { enabled: !!connectionId },
  );

  React.useEffect(() => {
    if (existingConn?.config && existingConn.config.provider === 'JIRA') {
      const cfg = existingConn.config;
      setName(existingConn.name);
      setBaseUrl(cfg.baseUrl);
      setEmail(cfg.email);
      setApiToken(cfg.apiToken);
      setProjectKey(cfg.projectKey);
      setJql(cfg.jql ?? '');
      setTargetProjectId(cfg.targetProjectId);
      setSyncSchedule(cfg.syncSchedule);
      setStatusMapping(cfg.statusMapping ?? {});
    }
  }, [existingConn]);

  // Sync history
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

  const syncMutation = trpc.integrations.triggerSync.useMutation();

  const handleTest = () => {
    setTestResult(null);
    testMutation.mutate({
      provider: 'JIRA',
      baseUrl,
      email,
      apiToken,
      projectKey,
      jql: jql || undefined,
      statusMapping,
      syncSchedule,
      targetProjectId,
    });
  };

  const handleSave = () => {
    const config = {
      provider: 'JIRA' as const,
      baseUrl,
      email,
      apiToken,
      projectKey,
      jql: jql || undefined,
      statusMapping: Object.keys(statusMapping).length > 0 ? statusMapping : undefined,
      syncSchedule,
      targetProjectId,
    };

    if (connectionId) {
      updateMutation.mutate({
        connectionId,
        name,
        config,
      });
    } else {
      createMutation.mutate({
        provider: 'JIRA',
        name,
        config,
      });
    }
  };

  const addStatusMapping = () => {
    setStatusMapping((prev) => ({ ...prev, '': '' }));
  };

  const updateMappingKey = (oldKey: string, newKey: string) => {
    setStatusMapping((prev) => {
      const updated = { ...prev };
      const value = updated[oldKey];
      delete updated[oldKey];
      updated[newKey] = value;
      return updated;
    });
  };

  const updateMappingValue = (key: string, value: string) => {
    setStatusMapping((prev) => ({ ...prev, [key]: value }));
  };

  const removeMapping = (key: string) => {
    setStatusMapping((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
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
          placeholder="Jira Integration"
        />
      </div>

      {/* Jira connection fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Jira Base URL</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://yourteam.atlassian.net"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Project Key</label>
          <input
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="PROJ"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">API Token</label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Jira API token"
          />
        </div>
      </div>

      {/* Optional JQL filter */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">
          JQL Filter <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="text"
          value={jql}
          onChange={(e) => setJql(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="project = PROJ AND status != Done ORDER BY created DESC"
        />
      </div>

      {/* Target project */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Target Project ID</label>
        <input
          type="text"
          value={targetProjectId}
          onChange={(e) => setTargetProjectId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Project ID to sync into"
        />
      </div>

      {/* Sync schedule */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Sync Schedule</label>
        <select
          value={syncSchedule}
          onChange={(e) => setSyncSchedule(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SCHEDULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Status mapping */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-text-muted">Status Mapping</label>
          <button
            type="button"
            onClick={addStatusMapping}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add Mapping
          </button>
        </div>
        <p className="text-[10px] text-text-muted mb-2">
          Map Jira status names to app statuses. Unmapped statuses use automatic normalization.
        </p>
        {Object.entries(statusMapping).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(statusMapping).map(([jiraStatus, appStatus], index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={jiraStatus}
                  onChange={(e) => updateMappingKey(jiraStatus, e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs bg-surface-lighter border border-surface-lighter rounded text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Jira status name"
                />
                <span className="text-xs text-text-muted">-&gt;</span>
                <select
                  value={appStatus}
                  onChange={(e) => updateMappingValue(jiraStatus, e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs bg-surface-lighter border border-surface-lighter rounded text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select status...</option>
                  {APP_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMapping(jiraStatus)}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-text-muted italic">No custom mappings. Default normalization will be used.</p>
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
          disabled={testMutation.isPending || !baseUrl || !email || !apiToken || !projectKey}
          className="px-4 py-2 text-xs font-medium bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted rounded-md transition-colors disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending || !baseUrl || !email || !apiToken || !projectKey || !targetProjectId}
          className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : connectionId ? 'Update' : 'Save'}
        </button>
        {connectionId && (
          <button
            type="button"
            onClick={() => syncMutation.mutate({ connectionId })}
            disabled={syncMutation.isPending}
            className="px-4 py-2 text-xs font-medium bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
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

      {/* Sync history */}
      {connectionId && syncHistory && syncHistory.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-muted mb-2">Sync History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-text-muted border-b border-surface-lighter">
                  <th className="text-left py-1.5 px-2">Started</th>
                  <th className="text-left py-1.5 px-2">Status</th>
                  <th className="text-right py-1.5 px-2">Synced</th>
                  <th className="text-right py-1.5 px-2">Failed</th>
                  <th className="text-right py-1.5 px-2">Skipped</th>
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
                        entry.status === 'RUNNING' ? 'text-yellow-400' :
                        'text-text-muted'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-text-muted">{entry.itemsSynced}</td>
                    <td className="py-1.5 px-2 text-right text-red-400">{entry.itemsFailed || '-'}</td>
                    <td className="py-1.5 px-2 text-right text-text-muted">{entry.itemsSkipped || '-'}</td>
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

export { JiraSyncConfig };
