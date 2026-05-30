import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

const users: User[] = [
  { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Bob Martinez', email: 'bob@example.com', role: 'Editor', status: 'Active' },
  { id: '3', name: 'Carol Diaz', email: 'carol@example.com', role: 'Viewer', status: 'Invited' },
  { id: '4', name: 'Dan Johnson', email: 'dan@example.com', role: 'Editor', status: 'Active' },
  { id: '5', name: 'Eve Wilson', email: 'eve@example.com', role: 'Admin', status: 'Inactive' },
];

const columns: DataTableColumn<User>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <span
        className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          row.status === 'Active'
            ? 'bg-success-bg text-success-text'
            : row.status === 'Invited'
              ? 'bg-info-subtle text-info'
              : 'bg-surface-lighter text-text-tertiary',
        ].join(' ')}
      >
        {row.status}
      </span>
    ),
  },
];

const meta = {
  title: 'Data/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Advanced data table with sorting, filtering, pagination, row selection, and bulk actions.',
      },
    },
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    columns: columns as DataTableColumn<Record<string, unknown>>[],
    data: users,
    rowKey: 'id',
  },
};

// ─── Sortable ─────────────────────────────────────────────────────────────────

export const Sortable: Story = {
  args: {
    columns: [] as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
  },
  render: function SortableStory() {
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const sortableColumns: DataTableColumn<User>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'role', header: 'Role', sortable: true },
      { key: 'status', header: 'Status' },
    ];

    const sorted = [...users].sort((a, b) => {
      const aVal = a[sortColumn as keyof User];
      const bVal = b[sortColumn as keyof User];
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    return (
      <DataTable
        columns={sortableColumns}
        data={sorted}
        rowKey="id"
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
        }}
      />
    );
  },
};

// ─── Selectable ───────────────────────────────────────────────────────────────

export const Selectable: Story = {
  args: {
    columns: [] as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
  },
  render: function SelectableStory() {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    return (
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={users}
          rowKey="id"
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
        />
        {selectedRows.size > 0 && (
          <div className="text-sm text-text-muted">
            Selected: {Array.from(selectedRows).join(', ')}
          </div>
        )}
      </div>
    );
  },
};

// ─── WithPagination ───────────────────────────────────────────────────────────

export const WithPagination: Story = {
  args: {
    columns: [] as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
  },
  render: function PaginatedStory() {
    const [page, setPage] = useState(1);
    const pageSize = 2;
    const paginated = users.slice((page - 1) * pageSize, page * pageSize);

    return (
      <DataTable
        columns={columns}
        data={paginated}
        rowKey="id"
        pagination={{
          page,
          pageSize,
          total: users.length,
          onPageChange: setPage,
        }}
      />
    );
  },
};

// ─── Loading ──────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: {
    columns: columns as DataTableColumn<Record<string, unknown>>[],
    data: users,
    rowKey: 'id',
    loading: true,
  },
};

// ─── Empty ────────────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: {
    columns: columns as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
    emptyMessage: 'No users found. Try adjusting your filters.',
  },
};

// ─── Striped ──────────────────────────────────────────────────────────────────

export const Striped: Story = {
  args: {
    columns: columns as DataTableColumn<Record<string, unknown>>[],
    data: users,
    rowKey: 'id',
    striped: true,
  },
};

// ─── StickyHeader ─────────────────────────────────────────────────────────────

export const StickyHeader: Story = {
  args: {
    columns: [] as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
  },
  render: () => {
    const manyUsers: User[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ['Admin', 'Editor', 'Viewer'][i % 3],
      status: ['Active', 'Invited', 'Inactive'][i % 3],
    }));

    return (
      <div className="h-64 overflow-auto rounded-xl">
        <DataTable
          columns={columns}
          data={manyUsers}
          rowKey="id"
          stickyHeader
        />
      </div>
    );
  },
};

// ─── Interactive ──────────────────────────────────────────────────────────────

export const Interactive: Story = {
  args: {
    columns: [] as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
  },
  render: function InteractiveStory() {
    const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ['Admin', 'Editor', 'Viewer'][i % 3],
      status: ['Active', 'Invited', 'Inactive'][i % 3],
    }));

    const [page, setPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const pageSize = 5;

    const sortableColumns: DataTableColumn<User>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'role', header: 'Role', sortable: true },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <span
            className={[
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              row.status === 'Active'
                ? 'bg-success-bg text-success-text'
                : row.status === 'Invited'
                  ? 'bg-info-subtle text-info'
                  : 'bg-surface-lighter text-text-tertiary',
            ].join(' ')}
          >
            {row.status}
          </span>
        ),
      },
    ];

    const sorted = [...allUsers].sort((a, b) => {
      const aVal = a[sortColumn as keyof User];
      const bVal = b[sortColumn as keyof User];
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    const paginated = sorted.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    return (
      <div className="space-y-4">
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-primary-subtle px-4 py-2 text-sm text-text-secondary">
            <span>{selectedRows.size} selected</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setSelectedRows(new Set())}
            >
              Clear
            </button>
          </div>
        )}
        <DataTable
          columns={sortableColumns}
          data={paginated}
          rowKey="id"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={(col, dir) => {
            setSortColumn(col);
            setSortDirection(dir);
          }}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          pagination={{
            page,
            pageSize,
            total: allUsers.length,
            onPageChange: setPage,
          }}
          onRowClick={(row) => console.log('Clicked:', row)}
        />
      </div>
    );
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    columns: [] as DataTableColumn<Record<string, unknown>>[],
    data: [],
    rowKey: 'id',
  },
  render: () => (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={users}
        rowKey="id"
      />
    </div>
  ),
};
