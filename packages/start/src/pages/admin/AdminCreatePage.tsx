import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { AdminLayout } from './AdminLayout';

type ColumnConfig = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'image' | 'link' | 'json' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
};

function FieldInput({
  col,
  value,
  onChange,
}: {
  col: ColumnConfig;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const readOnly = col.key === 'id' || col.key === 'createdAt' || col.key === 'updatedAt';
  if (readOnly) return null;

  const baseClass = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

  if (col.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    );
  }
  if (col.type === 'textarea') {
    return (
      <textarea rows={4} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={baseClass} />
    );
  }
  if (col.type === 'select' && col.options) {
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={baseClass}>
        <option value="">— select —</option>
        {col.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (col.type === 'number') {
    return <input type="number" value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))} className={baseClass} />;
  }
  if (col.type === 'date') {
    return <input type="datetime-local" value={value ? new Date(String(value)).toISOString().slice(0, 16) : ''} onChange={(e) => onChange(new Date(e.target.value).toISOString())} className={baseClass} />;
  }
  return <input type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
}

interface AdminCreatePageProps {
  resource: string;
}

export const AdminCreatePage: React.FC<AdminCreatePageProps> = ({ resource }) => {
  const trpc = getTRPC() as any;
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const resourcesQuery = trpc.admin.listResources.useQuery(undefined, { staleTime: 60_000 });
  const config = resourcesQuery.data?.find((r: any) => r.name === resource);
  const columns: ColumnConfig[] = (config?.columns ?? []).filter(
    (c: ColumnConfig) => c.key !== 'id' && c.key !== 'createdAt' && c.key !== 'updatedAt',
  );

  const createMutation = trpc.admin.create.useMutation({
    onSuccess: () => navigate(`/admin/${resource}`),
    onError: (e: any) => setError(e.message),
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <nav className="text-sm text-slate-500 mb-6 flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="hover:text-slate-800">Admin</button>
          <span>›</span>
          <button onClick={() => navigate(`/admin/${resource}`)} className="capitalize hover:text-slate-800">{resource}</button>
          <span>›</span>
          <span className="text-slate-800">New</span>
        </nav>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h1 className="text-lg font-semibold text-slate-900 capitalize">New {resource}</h1>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {columns.map((col) => (
              <div key={col.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{col.label}</label>
                <FieldInput col={col} value={formData[col.key]} onChange={(v) => setFormData((p) => ({ ...p, [col.key]: v }))} />
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={() => createMutation.mutate({ resource, data: formData })}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => navigate(`/admin/${resource}`)} className="px-4 py-2 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
