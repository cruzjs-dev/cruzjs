import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { AdminLayout } from './AdminLayout';

type ColumnConfig = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'image' | 'link' | 'json' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  sortable?: boolean;
  searchable?: boolean;
  hidden?: boolean;
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
  const baseClass = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
  const disabledClass = 'bg-slate-50 text-slate-500 cursor-not-allowed';

  if (col.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    );
  }

  if (col.type === 'textarea') {
    return (
      <textarea
        value={String(value ?? '')}
        disabled={readOnly}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClass} ${readOnly ? disabledClass : 'border-slate-300'}`}
      />
    );
  }

  if (col.type === 'select' && col.options) {
    return (
      <select
        value={String(value ?? '')}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClass} ${readOnly ? disabledClass : 'border-slate-300'}`}
      >
        <option value="">— select —</option>
        {col.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (col.type === 'number') {
    return (
      <input
        type="number"
        value={String(value ?? '')}
        disabled={readOnly}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${baseClass} ${readOnly ? disabledClass : 'border-slate-300'}`}
      />
    );
  }

  if (col.type === 'date') {
    const dateVal = value ? new Date(String(value)).toISOString().slice(0, 16) : '';
    return (
      <input
        type="datetime-local"
        value={dateVal}
        disabled={readOnly}
        onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        className={`${baseClass} ${readOnly ? disabledClass : 'border-slate-300'}`}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? '')}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseClass} ${readOnly ? disabledClass : 'border-slate-300'}`}
    />
  );
}

interface AdminDetailPageProps {
  resource: string;
  id: string;
}

export const AdminDetailPage: React.FC<AdminDetailPageProps> = ({ resource, id }) => {
  const trpc = getTRPC() as any;
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const resourcesQuery = trpc.admin.listResources.useQuery(undefined, { staleTime: 60_000 });
  const config = resourcesQuery.data?.find((r: any) => r.name === resource);
  const columns: ColumnConfig[] = config?.columns ?? [];

  const recordQuery = trpc.admin.get.useQuery(
    { resource, id },
    {
      enabled: !!config,
      onSuccess: (data: any) => { if (!formData) setFormData(data); },
    },
  );

  const updateMutation = trpc.admin.update.useMutation({
    onSuccess: () => navigate(`/admin/${resource}`),
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = trpc.admin.delete.useMutation({
    onSuccess: () => navigate(`/admin/${resource}`),
    onError: (e: any) => setError(e.message),
  });

  const data = formData ?? recordQuery.data ?? {};

  if (resourcesQuery.isLoading || recordQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-6 flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="hover:text-slate-800">Admin</button>
          <span>›</span>
          <button onClick={() => navigate(`/admin/${resource}`)} className="capitalize hover:text-slate-800">{resource}</button>
          <span>›</span>
          <span className="text-slate-800 font-mono text-xs">{id}</span>
        </nav>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h1 className="text-lg font-semibold text-slate-900 capitalize">Edit {resource}</h1>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {columns.map((col) => (
              <div key={col.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {col.label}
                  {(col.key === 'id' || col.key === 'createdAt' || col.key === 'updatedAt') && (
                    <span className="ml-1 text-xs text-slate-400">(read-only)</span>
                  )}
                </label>
                <FieldInput
                  col={col}
                  value={data[col.key]}
                  onChange={(v) => setFormData((prev) => ({ ...prev ?? {}, [col.key]: v }))}
                />
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => updateMutation.mutate({ resource, id, data: formData ?? {} })}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => navigate(`/admin/${resource}`)}
                className="px-4 py-2 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>

            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700">Confirm delete?</span>
                <button
                  onClick={() => deleteMutation.mutate({ resource, ids: [id] })}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-1.5 text-slate-600 rounded text-sm hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
