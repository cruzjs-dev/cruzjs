import React, { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useAuth } from '@cruzjs/core/auth/auth-provider';

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const DangerZonePage: React.FC = () => {
  const trpc = getTRPC() as any;
  const { user } = useAuth();
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exported, setExported] = useState(false);

  const statusQuery = trpc.auth.accountDeletionStatus.useQuery();
  const deletionRequestedAt = statusQuery.data?.deletionRequestedAt ?? null;

  const requestDeletion = trpc.auth.accountRequestDeletion.useMutation({
    onSuccess: () => {
      setShowDeleteDialog(false);
      setDeleteConfirmEmail('');
      statusQuery.refetch();
    },
  });

  const cancelDeletion = trpc.auth.accountCancelDeletion.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });

  const exportQuery = trpc.auth.accountExportData.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (result.data) {
      downloadJson(result.data, 'my-data.json');
      setExported(true);
    }
  };

  const canConfirmDelete = deleteConfirmEmail === user?.email;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Danger Zone</h2>
        <p className="text-sm text-slate-500 mt-1">Irreversible account actions.</p>
      </div>

      {/* Export data */}
      <div className="border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900">Export my data</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Download a JSON file with your account data.
        </p>
        <button
          onClick={handleExport}
          disabled={exportQuery.isFetching}
          className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {exportQuery.isFetching ? 'Preparing…' : exported ? 'Download again' : 'Download my data'}
        </button>
      </div>

      {/* Delete account */}
      <div className="border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-700">Delete account</h3>

        {deletionRequestedAt ? (
          <div className="mt-3 space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 font-medium">
                Account deletion scheduled — {daysUntil(deletionRequestedAt)} days remaining
              </p>
              <p className="text-xs text-red-600 mt-1">
                Your account and all data will be permanently deleted after the grace period.
              </p>
            </div>
            <button
              onClick={() => cancelDeletion.mutate()}
              disabled={cancelDeletion.isPending}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelDeletion.isPending ? 'Cancelling…' : 'Cancel deletion'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Your account will enter a 30-day grace period before permanent deletion.
              You can cancel at any time during this period.
            </p>

            {showDeleteDialog ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Type your email address <span className="font-mono font-medium">{user?.email}</span> to confirm.
                </p>
                <input
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder={user?.email ?? ''}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => requestDeletion.mutate()}
                    disabled={!canConfirmDelete || requestDeletion.isPending}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {requestDeletion.isPending ? 'Processing…' : 'Delete my account'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteDialog(false); setDeleteConfirmEmail(''); }}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {requestDeletion.error && (
                  <p className="text-sm text-red-600">{(requestDeletion.error as any).message}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete account
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
