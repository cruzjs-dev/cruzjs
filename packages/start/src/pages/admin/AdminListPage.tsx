import { AdminLayout } from './AdminLayout';
import { AdminTable } from '../../dashboard/AdminTable';
import { AdminTableFilters } from '../../dashboard/AdminTableFilters';
import { AdminTablePagination } from '../../dashboard/AdminTablePagination';
import { AdminBulkActions } from '../../dashboard/AdminBulkActions';
import { useAdminResource } from '../../dashboard/useAdminResource';

interface AdminListPageProps {
  resource: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export const AdminListPage: React.FC<AdminListPageProps> = ({ resource, onRowClick }) => {
  const {
    config,
    configLoading,
    data,
    isLoading,
    page,
    setPage,
    search,
    handleSearch,
    sort,
    toggleSort,
    filters,
    handleFilter,
    clearFilters,
    selectedIds,
    toggleRow,
    toggleAll,
    clearSelection,
    deleteSelected,
    deleteRow,
    isDeleting,
  } = useAdminResource(resource);

  if (configLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
      </AdminLayout>
    );
  }

  if (!config) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-slate-500">
          Resource <code className="font-mono bg-slate-100 px-1 rounded">{resource}</code> not found.
        </div>
      </AdminLayout>
    );
  }

  const rows: Record<string, unknown>[] = data?.rows ?? [];
  const pagination = data
    ? { total: data.total, totalPages: data.totalPages, perPage: data.perPage }
    : { total: 0, totalPages: 1, perPage: 20 };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-900 capitalize">{resource}</h1>
          <div className="text-sm text-slate-500">
            {pagination.total} total
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <AdminTableFilters
            filters={config.filters ?? []}
            activeFilters={filters}
            onFilterChange={handleFilter}
            onClear={clearFilters}
            search={search}
            onSearch={handleSearch}
          />

          <AdminBulkActions
            selectedCount={selectedIds.length}
            onDelete={deleteSelected}
            isDeleting={isDeleting}
            onClear={clearSelection}
          />

          <AdminTable
            resource={resource}
            columns={config.columns}
            rows={rows}
            isLoading={isLoading}
            sort={sort}
            selectedIds={selectedIds}
            onSort={toggleSort}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            onDeleteRow={deleteRow}
            onRowClick={onRowClick}
          />

          <AdminTablePagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            perPage={pagination.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>
    </AdminLayout>
  );
};
