import { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { ConfirmModal, EmptyState, LoadingState, useToast } from '@cruzjs/ui';
import { CreateApiKeyModal } from './CreateApiKeyModal';
import type { ApiKeyResponse } from '../api-key.types';

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function scopeBadgeClasses(scope: string): string {
  switch (scope) {
    case 'READ':
      return 'bg-emerald-100 text-emerald-700';
    case 'WRITE':
      return 'bg-amber-100 text-amber-700';
    case 'ADMIN':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-surface-light text-text-muted';
  }
}

// ============================================================================
// ApiKeyManager Component
// ============================================================================

export const ApiKeyManager: React.FC = () => {
  const trpc = getTRPC();
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyResponse | null>(null);

  const keysQuery = trpc.apiKey.list.useQuery();
  const revokeMutation = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      toast({
        title: 'API key revoked',
        description: 'The API key has been revoked and can no longer be used.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setRevokeTarget(null);
      keysQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error revoking API key',
        description: error.message || 'Failed to revoke API key',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    await revokeMutation.mutateAsync({ keyId: revokeTarget.id });
  };

  if (keysQuery.isLoading) {
    return <LoadingState text="Loading API keys..." />;
  }

  const keys = keysQuery.data ?? [];
  const activeKeys = keys.filter((k: any) => !k.revokedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">
          {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          onClick={() => setIsCreateOpen(true)}
        >
          Create API Key
        </button>
      </div>

      {keys.length === 0 ? (
        <EmptyState
          message="No API keys yet. Create one to enable agent access."
          icon={
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
          action={
            <button
              type="button"
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              onClick={() => setIsCreateOpen(true)}
            >
              Create API Key
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Name</th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Key Prefix</th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Scopes</th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Last Used</th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Created</th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key: any) => (
                <tr
                  key={key.id}
                  className={`border-b border-surface-border ${key.revokedAt ? 'opacity-50 line-through' : ''}`}
                >
                  <td className="py-2 px-3">
                    <span className="text-sm font-medium text-text-strong">
                      {key.name}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-mono text-text-muted">
                      {key.keyPrefix}...
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {key.scopes.map((scope: string) => (
                        <span
                          key={scope}
                          className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${scopeBadgeClasses(scope)}`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs text-text-muted">
                      {formatRelativeTime(key.lastUsedAt)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs text-text-muted">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {key.revokedAt ? (
                      <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded border border-red-300 text-red-600">
                        Revoked
                      </span>
                    ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                      <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded border border-amber-300 text-amber-600">
                        Expired
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {!key.revokedAt && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                        onClick={() => setRevokeTarget(key)}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateApiKeyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => keysQuery.refetch()}
      />

      {/* Revoke Confirmation */}
      <ConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke API Key"
        confirmLabel="Revoke Key"
        variant="danger"
        isLoading={revokeMutation.isPending}
      >
        <div className="flex flex-col gap-3">
          <p className="text-text">
            Are you sure you want to revoke <strong>{revokeTarget?.name}</strong>?
          </p>
          <p className="text-sm text-text-muted">
            This action cannot be undone. Any agents or integrations using this key will
            immediately lose access.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
};
