/**
 * Linear Sync Configuration Component
 *
 * Connection setup, status mapping editor, sync schedule selector,
 * and sync history table for Linear one-way pull integration.
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

interface LinearSyncConfigProps {
  connectionId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// LinearSyncConfig Component
// ============================================================================

const LinearSyncConfig: React.FC<LinearSyncConfigProps> = ({ connectionId, onSave, onCancel }) => {
  const trpc = getTRPC();
  const [name, setName] = useState('Linear Integration');
  const [apiKey, setApiKey] = useState('');
  const [teamId, setTeamId] = useState('');
  const [linearProjectId, setLinearProjectId] = useState('');
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
    if (existingConn?.config && existingConn.config.provider === 'LINEAR') {
      const cfg = existingConn.config;
      setName(existingConn.name);
      setApiKey(cfg.apiKey);
      setTeamId(cfg.teamId ?? '');
      setLinearProjectId(cfg.projectId ?? '');
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
      provider: 'LINEAR',
      apiKey,
      teamId: teamId || undefined,
      projectId: linearProjectId || undefined,
      statusMapping,
      syncSchedule,
      targetProjectId,
    });
  };

  const handleSave = () => {
    const config = {
      provider: 'LINEAR' as const,
      apiKey,
      teamId: teamId || undefined,
      projectId: linearProjectId || undefined,
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
        provider: 'LINEAR',
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
          placeholder="Linear Integration"
        />
      </div>

      {/* Linear connection fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-text-muted mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="lin_api_..."
          />
          <p className="text-[10px] text-text-muted mt-1">
            Generate a personal API key from Linear Settings &gt; API.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Team ID <span className="text-text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Filter by team"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Linear Project ID <span className="text-text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={linearProjectId}
            onChange={(e) => setLinearProjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-lighter border border-surface-lighter rounded-md text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Filter by Linear project"
          />
        </div>
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
          Map Linear status names to app statuses. Unmapped statuses use automatic normalization.
        </p>
        {Object.entries(statusMapping).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(statusMapping).map(([linearStatus, appStatus], index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={linearStatus}
                  onChange={(e) => updateMappingKey(linearStatus, e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs bg-surface-lighter border border-surface-lighter rounded text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Linear status name"
                />
                <span className="text-xs text-text-muted">-&gt;</span>
                <select
                  value={appStatus}
                  onChange={(e) => updateMappingValue(linearStatus, e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs bg-surface-lighter border border-surface-lighter rounded text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select status...</option>
                  {APP_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMapping(linearStatus)}
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
          disabled={testMutation.isPending || !apiKey}
          className="px-4 py-2 text-xs font-medium bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted rounded-md transition-colors disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending || !apiKey || !targetProjectId}
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

export { LinearSyncConfig };
