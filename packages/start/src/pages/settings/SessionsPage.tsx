import React, { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useAuth } from '@cruzjs/core/auth/auth-provider';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function DeviceIcon() {
  return (
    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
};

interface SessionsPageProps {
  currentSessionId?: string;
}

export const SessionsPage: React.FC<SessionsPageProps> = ({ currentSessionId }) => {
  const trpc = getTRPC() as any;
  const { user } = useAuth();
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);

  const sessionsQuery = trpc.auth.sessionsList.useQuery();
  const sessions: Session[] = sessionsQuery.data ?? [];

  const revokeMutation = trpc.auth.sessionsRevoke.useMutation({
    onSuccess: () => sessionsQuery.refetch(),
  });

  const revokeAllMutation = trpc.auth.sessionsRevokeAll.useMutation({
    onSuccess: () => { setRevokeAllConfirm(false); sessionsQuery.refetch(); },
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Active Sessions</h2>
          <p className="text-sm text-slate-500 mt-1">All devices currently signed in to your account.</p>
        </div>

        {sessions.length > 1 && (
          revokeAllConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Revoke all other sessions?</span>
              <button
                onClick={() => revokeAllMutation.mutate()}
                disabled={revokeAllMutation.isPending}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button onClick={() => setRevokeAllConfirm(false)} className="px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100 rounded">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setRevokeAllConfirm(true)}
              className="px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
            >
              Revoke all other devices
            </button>
          )
        )}
      </div>

      <div className="space-y-3">
        {sessionsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-16" />
          ))
        ) : sessions.length === 0 ? (
          <p className="text-slate-400 text-sm">No sessions found.</p>
        ) : (
          sessions.map((session) => {
            const isCurrent = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <DeviceIcon />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {session.userAgent
                        ? session.userAgent.slice(0, 50) + (session.userAgent.length > 50 ? '…' : '')
                        : 'Unknown device'}
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Current session
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {session.ipAddress ?? 'Unknown location'} · signed in {timeAgo(session.createdAt)}
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => revokeMutation.mutate({ sessionId: session.id })}
                    disabled={revokeMutation.isPending}
                    className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
