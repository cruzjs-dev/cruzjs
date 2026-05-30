import { useEffect } from 'react';

type Job = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  payload: Record<string, unknown>;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

interface JobDetailProps {
  job: Job;
  onClose: () => void;
  onRetry: (id: string) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, onClose, onRetry }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-lg bg-white shadow-xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Job Detail</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['ID', <span key="id" className="font-mono text-xs break-all">{job.id}</span>],
              ['Type', job.type],
              ['Status', job.status],
              ['Attempts', `${job.attempts}/${job.maxAttempts}`],
              ['Created', new Date(job.createdAt).toLocaleString()],
              ['Scheduled', new Date(job.scheduledFor).toLocaleString()],
              ['Started', job.startedAt ? new Date(job.startedAt).toLocaleString() : '—'],
              ['Completed', job.completedAt ? new Date(job.completedAt).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                <div className="text-slate-800">{value}</div>
              </div>
            ))}
          </div>

          {/* Payload */}
          <div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Payload</div>
            <pre className="bg-slate-900 text-green-300 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          {/* Error */}
          {job.error && (
            <div>
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Error</div>
              <pre className="bg-red-50 text-red-800 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap border border-red-200">
                {job.error}
              </pre>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          {job.status === 'FAILED' && (
            <button
              onClick={() => onRetry(job.id)}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Retry job
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
