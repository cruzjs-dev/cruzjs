import { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { JobsTable } from './JobsTable';
import { JobDetail } from './JobDetail';

type Tab = 'ALL' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';

const tabs: Tab[] = ['ALL', 'PENDING', 'PROCESSING', 'FAILED', 'COMPLETED'];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 border-l-4 ${color}`}>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export const JobsDashboard: React.FC = () => {
  const trpc = getTRPC() as any;
  const [tab, setTab] = useState<Tab>('ALL');
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const countsQuery = trpc.job.counts.useQuery(undefined, { refetchInterval: 10_000 });
  const counts = countsQuery.data ?? { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };

  const listQuery = trpc.job.list.useQuery(
    { status: tab === 'ALL' ? undefined : tab, limit: 100 },
    { refetchInterval: 10_000 },
  );

  const retryMutation = trpc.job.retry.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  const cancelMutation = trpc.job.cancel.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Job Monitor</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Pending" value={counts.pending} color="border-yellow-400" />
        <StatCard label="Processing" value={counts.processing} color="border-blue-400" />
        <StatCard label="Completed" value={counts.completed} color="border-green-400" />
        <StatCard label="Failed" value={counts.failed} color="border-red-400" />
        <StatCard label="Total" value={counts.total} color="border-slate-300" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <JobsTable
          jobs={listQuery.data?.jobs ?? []}
          isLoading={listQuery.isLoading}
          onView={(job) => setSelectedJob(job)}
          onRetry={(id) => retryMutation.mutate({ id })}
          onCancel={(id) => cancelMutation.mutate({ id })}
        />
      </div>

      {selectedJob && (
        <JobDetail job={selectedJob} onClose={() => setSelectedJob(null)} onRetry={(id) => { retryMutation.mutate({ id }); setSelectedJob(null); }} />
      )}
    </div>
  );
};
