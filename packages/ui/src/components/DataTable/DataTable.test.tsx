import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';

type TestRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

const columns: DataTableColumn<TestRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status' },
];

const data: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Bob', email: 'bob@test.com', role: 'Editor', status: 'Active' },
  { id: '3', name: 'Carol', email: 'carol@test.com', role: 'Viewer', status: 'Invited' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('calls onSort when sortable header clicked', () => {
    const onSort = vi.fn();
    const sortableColumns: DataTableColumn<TestRow>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email' },
    ];

    render(
      <DataTable
        columns={sortableColumns}
        data={data}
        rowKey="id"
        onSort={onSort}
      />,
    );

    const sortButton = screen.getByRole('button', { name: /Name/i });
    fireEvent.click(sortButton);

    expect(onSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('toggles sort direction when same column clicked again', () => {
    const onSort = vi.fn();
    const sortableColumns: DataTableColumn<TestRow>[] = [
      { key: 'name', header: 'Name', sortable: true },
    ];

    render(
      <DataTable
        columns={sortableColumns}
        data={data}
        rowKey="id"
        sortColumn="name"
        sortDirection="asc"
        onSort={onSort}
      />,
    );

    const sortButton = screen.getByRole('button', { name: /Name/i });
    fireEvent.click(sortButton);

    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('renders checkboxes when selectable', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        selectable
        selectedRows={new Set<string>()}
        onSelectionChange={() => {}}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // 1 header checkbox + 3 row checkboxes
    expect(checkboxes).toHaveLength(4);
  });

  it('calls onSelectionChange on row checkbox click', () => {
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        selectable
        selectedRows={new Set<string>()}
        onSelectionChange={onSelectionChange}
      />,
    );

    // Click second checkbox (first row checkbox, after the "select all" header)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const passedSet = onSelectionChange.mock.calls[0][0] as Set<string>;
    expect(passedSet.has('1')).toBe(true);
    expect(passedSet.size).toBe(1);
  });

  it('select all checkbox selects all rows', () => {
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        selectable
        selectedRows={new Set<string>()}
        onSelectionChange={onSelectionChange}
      />,
    );

    // First checkbox is "select all"
    const selectAllCheckbox = screen.getByLabelText('Select all rows');
    fireEvent.click(selectAllCheckbox);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const passedSet = onSelectionChange.mock.calls[0][0] as Set<string>;
    expect(passedSet.size).toBe(3);
    expect(passedSet.has('1')).toBe(true);
    expect(passedSet.has('2')).toBe(true);
    expect(passedSet.has('3')).toBe(true);
  });

  it('shows empty message when no data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey="id"
        emptyMessage="Nothing here"
      />,
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows default empty message', () => {
    render(<DataTable columns={columns} data={[]} rowKey="id" />);

    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" loading />);

    expect(screen.getByTestId('datatable-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders pagination controls', () => {
    const onPageChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        pagination={{
          page: 1,
          pageSize: 10,
          total: 50,
          onPageChange,
        }}
      />,
    );

    const paginationBar = screen.getByTestId('datatable-pagination');
    expect(paginationBar).toBeInTheDocument();
    expect(within(paginationBar).getByText(/Showing 1–10 of 50/)).toBeInTheDocument();
    expect(within(paginationBar).getByText('1 / 5')).toBeInTheDocument();

    // Click next page
    const nextButton = screen.getByLabelText('Next page');
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables prev button on first page', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        pagination={{
          page: 1,
          pageSize: 10,
          total: 50,
          onPageChange: () => {},
        }}
      />,
    );

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        pagination={{
          page: 5,
          pageSize: 10,
          total: 50,
          onPageChange: () => {},
        }}
      />,
    );

    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('calls onRowClick on row click', () => {
    const onRowClick = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        onRowClick={onRowClick}
      />,
    );

    fireEvent.click(screen.getByText('Alice').closest('tr')!);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('applies striped styling', () => {
    const { container } = render(
      <DataTable columns={columns} data={data} rowKey="id" striped />,
    );

    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(3);
    // All data rows should have the striped class
    bodyRows.forEach((row) => {
      expect(row.className).toContain('even:bg-surface-light');
    });
  });

  it('supports custom render function', () => {
    const customColumns: DataTableColumn<TestRow>[] = [
      {
        key: 'name',
        header: 'Name',
        render: (row) => <strong data-testid="custom-render">{row.name}</strong>,
      },
    ];

    render(<DataTable columns={customColumns} data={data} rowKey="id" />);

    const rendered = screen.getAllByTestId('custom-render');
    expect(rendered).toHaveLength(3);
    expect(rendered[0]).toHaveTextContent('Alice');
  });

  it('supports function-based rowKey', () => {
    const onRowClick = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey={(row) => `custom-${row.id}`}
        onRowClick={onRowClick}
      />,
    );

    fireEvent.click(screen.getByText('Bob').closest('tr')!);
    expect(onRowClick).toHaveBeenCalledWith(data[1]);
  });
});
