import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableFooter } from './Table';

const meta = {
  title: 'Data Display/Table',
  component: Table,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Composable data table with sorting, striped rows, and sticky headers.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['default', 'striped'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    stickyHeader: { control: 'boolean' },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const users = [
  { name: 'Alice Chen', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { name: 'Bob Martinez', email: 'bob@example.com', role: 'Editor', status: 'Active' },
  { name: 'Carol Diaz', email: 'carol@example.com', role: 'Viewer', status: 'Invited' },
  { name: 'Dan Johnson', email: 'dan@example.com', role: 'Editor', status: 'Active' },
  { name: 'Eve Wilson', email: 'eve@example.com', role: 'Admin', status: 'Inactive' },
];

export const Default: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Role</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.email}>
            <TableCell className="font-medium text-text-strong">{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.role}</TableCell>
            <TableCell>
              <span className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                u.status === 'Active' ? 'bg-success-bg text-success-text' :
                u.status === 'Invited' ? 'bg-info-subtle text-info' :
                'bg-surface-lighter text-text-tertiary',
              ].join(' ')}>
                {u.status}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Striped: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <Table variant="striped">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Role</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.email}>
            <TableCell className="font-medium text-text-strong">{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithSorting: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: function SortableTable() {
    const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'name', dir: 'asc' });
    const sorted = [...users].sort((a, b) => {
      const aVal = a[sort.col as keyof typeof a];
      const bVal = b[sort.col as keyof typeof b];
      return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    const toggle = (col: string) => {
      setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
    };
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell sortable sortDirection={sort.col === 'name' ? sort.dir : null} onSort={() => toggle('name')}>
              Name
            </TableHeaderCell>
            <TableHeaderCell sortable sortDirection={sort.col === 'email' ? sort.dir : null} onSort={() => toggle('email')}>
              Email
            </TableHeaderCell>
            <TableHeaderCell sortable sortDirection={sort.col === 'role' ? sort.dir : null} onSort={() => toggle('role')}>
              Role
            </TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((u) => (
            <TableRow key={u.email}>
              <TableCell className="font-medium text-text-strong">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const WithSelection: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: function SelectableTable() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const toggle = (email: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(email)) next.delete(email);
        else next.add(email);
        return next;
      });
    };
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-10">
              <input
                type="checkbox"
                checked={selected.size === users.length}
                onChange={() => setSelected(selected.size === users.length ? new Set() : new Set(users.map((u) => u.email)))}
                className="rounded"
              />
            </TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.email} selected={selected.has(u.email)}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(u.email)}
                  onChange={() => toggle(u.email)}
                  className="rounded"
                />
              </TableCell>
              <TableCell className="font-medium text-text-strong">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const WithFooter: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <Table size="sm">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell className="text-right">Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow><TableCell>Hosting</TableCell><TableCell className="text-right tabular-nums">$29.00</TableCell></TableRow>
        <TableRow><TableCell>Domain</TableCell><TableCell className="text-right tabular-nums">$12.00</TableCell></TableRow>
        <TableRow><TableCell>SSL Certificate</TableCell><TableCell className="text-right tabular-nums">$0.00</TableCell></TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold text-text-strong">Total</TableCell>
          <TableCell className="text-right font-semibold text-text-strong tabular-nums">$41.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="p-4">
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.slice(0, 3).map((u) => (
            <TableRow key={u.email}>
              <TableCell className="font-medium text-text-strong">{u.name}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
