import { AdminLayout } from '@cruzjs/start/pages/admin/AdminLayout';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useNavigate } from 'react-router';

const AdminOverviewPage: React.FC = () => {
  const trpc = getTRPC() as any;
  const navigate = useNavigate();

  const { data: resources } = trpc.admin.listResources.useQuery(undefined, { staleTime: 60_000 });
  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { staleTime: 30_000 });

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-6">Admin Overview</h1>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {(stats as any[]).map((s: { resource: string; count: number; trend: string }) => (
              <button
                key={s.resource}
                onClick={() => navigate(`/admin/${s.resource}`)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:border-brand-300 transition-colors"
              >
                <div className="text-2xl font-bold text-slate-900">{s.count}</div>
                <div className="text-sm text-slate-500 capitalize mt-1">{s.resource}</div>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {resources?.map((r: { name: string }) => (
            <button
              key={r.name}
              onClick={() => navigate(`/admin/${r.name}`)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:border-brand-300 transition-colors"
            >
              <div className="text-sm font-semibold text-slate-700 capitalize">{r.name}</div>
              <div className="text-xs text-slate-400 mt-1">View all →</div>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOverviewPage;
