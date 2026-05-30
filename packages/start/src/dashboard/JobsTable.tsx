type JobRow = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  scheduledFor: string;
  createdAt: string;
};

const statusVariants: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

interface JobsTableProps {
  jobs: JobRow[];
  isLoading: boolean;
  onView: (job: JobRow) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded" /></td>
      ))}
    </tr>
  );
}

export const JobsTable: React.FC<JobsTableProps> = ({ jobs, isLoading, onView, onRetry, onCancel }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50">
        <tr>
          {['Type', 'Status', 'Attempts', 'Scheduled', 'Created', 'Actions'].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-100">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : jobs.length === 0
          ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No jobs found</td>
            </tr>
          )
          : jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">{job.type}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariants[job.status] ?? 'bg-slate-100 text-slate-700'}`}>
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{job.attempts}/{job.maxAttempts}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{new Date(job.scheduledFor).toLocaleString()}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{new Date(job.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => onView(job)} className="text-xs text-brand-600 hover:underline">View</button>
                  {job.status === 'FAILED' && (
                    <button onClick={() => onRetry(job.id)} className="text-xs text-green-600 hover:underline">Retry</button>
                  )}
                  {job.status === 'PENDING' && (
                    <button onClick={() => onCancel(job.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);
