import { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

export type AdminSortState = { column: string; direction: 'asc' | 'desc' } | null;

export function useAdminResource(resourceName: string) {
  const trpc = getTRPC() as any;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AdminSortState>(null);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const resourceQuery = trpc.admin.listResources.useQuery(undefined, {
    staleTime: 60_000,
  });

  const config = resourceQuery.data?.find((r: any) => r.name === resourceName);

  const listQuery = trpc.admin.list.useQuery(
    {
      resource: resourceName,
      page,
      perPage: config?.perPage ?? 20,
      search: search || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sortBy: sort?.column,
      sortDir: sort?.direction,
    },
    { enabled: !!config, keepPreviousData: true },
  );

  const deleteMutation = trpc.admin.delete.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      setSelectedIds([]);
    },
  });

  function toggleSort(column: string) {
    setSort((prev) => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
    setPage(1);
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll(ids: string[]) {
    setSelectedIds((prev) => (prev.length === ids.length ? [] : ids));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleFilter(key: string, value: unknown) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    await deleteMutation.mutateAsync({ resource: resourceName, ids: selectedIds });
  }

  async function deleteRow(id: string) {
    await deleteMutation.mutateAsync({ resource: resourceName, ids: [id] });
  }

  return {
    config,
    configLoading: resourceQuery.isLoading,
    data: listQuery.data,
    isLoading: listQuery.isLoading,
    refetch: listQuery.refetch,
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
    isDeleting: deleteMutation.isPending,
  };
}
