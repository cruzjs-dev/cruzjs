import type { AdminSortState } from './useAdminResource';

type AdminColumnConfig = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'image' | 'link' | 'json';
  sortable?: boolean;
  hidden?: boolean;
  truncate?: number;
  format?: (value: unknown) => string;
};

function formatValue(value: unknown, col: AdminColumnConfig): string {
  if (value === null || value === undefined) return '—';
  if (col.format) return col.format(value);
  if (col.type === 'date') {
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  const str = String(value);
  if (col.truncate && str.length > col.truncate) return str.slice(0, col.truncate) + '…';
  return str;
}

function CellRenderer({ value, col }: { value: unknown; col: AdminColumnConfig }) {
  if (col.type === 'boolean') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (col.type === 'badge') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {String(value ?? '—')}
      </span>
    );
  }
  if (col.type === 'image' && value) {
    return <img src={String(value)} alt="" className="h-8 w-8 rounded object-cover" />;
  }
  return <span className="text-slate-900">{formatValue(value, col)}</span>;
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 w-4 bg-slate-200 rounded" />
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-12" />
      </td>
    </tr>
  );
}

interface AdminTableProps {
  resource: string;
  columns: AdminColumnConfig[];
  rows: Record<string, unknown>[];
  isLoading: boolean;
  sort: AdminSortState;
  selectedIds: string[];
  onSort: (column: string) => void;
  onToggleRow: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onDeleteRow: (id: string) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
}

const SortIcon: React.FC<{ active: boolean; direction: 'asc' | 'desc' }> = ({ active, direction }) => (
  <svg className={`w-3 h-3 ml-1 inline ${active ? 'text-brand-600' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    {direction === 'asc' || !active
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
  </svg>
);

export const AdminTable: React.FC<AdminTableProps> = ({
  columns,
  rows,
  isLoading,
  sort,
  selectedIds,
  onSort,
  onToggleRow,
  onToggleAll,
  onDeleteRow,
  onRowClick,
}) => {
  const visibleColumns = columns.filter((c) => !c.hidden);
  const allIds = rows.map((r) => String(r.id ?? ''));
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(allIds)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </th>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wide text-xs ${col.sortable ? 'cursor-pointer hover:text-brand-600 select-none' : ''}`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                {col.label}
                {col.sortable && (
                  <SortIcon
                    active={sort?.column === col.key}
                    direction={sort?.column === col.key ? sort.direction : 'asc'}
                  />
                )}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} colCount={visibleColumns.length} />
              ))
            : rows.length === 0
            ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  No records found
                </td>
              </tr>
            )
            : rows.map((row, idx) => {
              const id = String(row.id ?? idx);
              return (
                <tr
                  key={id}
                  className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${selectedIds.includes(id) ? 'bg-brand-50' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  <td
                    className="px-4 py-3"
                    onClick={(e) => { e.stopPropagation(); onToggleRow(id); }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(id)}
                      onChange={() => onToggleRow(id)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      <CellRenderer value={row[col.key]} col={col} />
                    </td>
                  ))}
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onDeleteRow(id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};
