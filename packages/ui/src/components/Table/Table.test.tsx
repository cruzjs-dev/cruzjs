import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow } from './Table';

describe('Table', () => {
  it('renders a table', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders caption', () => {
    render(
      <Table>
        <TableCaption>User List</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('User List')).toBeInTheDocument();
  });

  it('handles sortable header', () => {
    const onSort = vi.fn();
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell sortable onSort={onSort} sortDirection="asc">
              Name
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const sortButton = screen.getByRole('button', { name: /Name/i });
    fireEvent.click(sortButton);
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('sets aria-sort on sortable header', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell sortable sortDirection="asc">
              Name
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('applies selected style', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow selected>
            <TableCell>Selected</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const row = container.querySelector('tr');
    expect(row?.className).toContain('bg-primary-subtle');
  });

  it('renders multiple rows', () => {
    render(
      <Table>
        <TableBody>
          <TableRow><TableCell>Row 1</TableCell></TableRow>
          <TableRow><TableCell>Row 2</TableCell></TableRow>
          <TableRow><TableCell>Row 3</TableCell></TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});
