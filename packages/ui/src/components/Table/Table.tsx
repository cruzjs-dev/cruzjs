import React, { forwardRef } from 'react';

export type TableVariant = 'default' | 'striped';
export type TableSize = 'sm' | 'md' | 'lg';

export type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  variant?: TableVariant;
  size?: TableSize;
  stickyHeader?: boolean;
};

export type TableHeadProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  selected?: boolean;
};
export type TableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
};
export type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
export type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

const sizeStyles: Record<TableSize, { cell: string; header: string }> = {
  sm: { cell: 'px-3 py-2 text-xs', header: 'px-3 py-2 text-xs' },
  md: { cell: 'px-4 py-3 text-sm', header: 'px-4 py-2.5 text-xs' },
  lg: { cell: 'px-5 py-4 text-sm', header: 'px-5 py-3 text-xs' },
};

type TableContextType = {
  variant: TableVariant;
  size: TableSize;
  stickyHeader: boolean;
};

const TableContext = React.createContext<TableContextType>({
  variant: 'default',
  size: 'md',
  stickyHeader: false,
});

export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { variant = 'default', size = 'md', stickyHeader = false, className, children, ...rest },
  ref,
) {
  return (
    <TableContext.Provider value={{ variant, size, stickyHeader }}>
      <div className="w-full overflow-x-auto rounded-2xl border border-surface-border">
        <table
          ref={ref}
          className={['w-full border-collapse text-left', className].filter(Boolean).join(' ')}
          {...rest}
        >
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
});

Table.displayName = 'Table';

export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(function TableHead(
  { className, children, ...rest },
  ref,
) {
  const { stickyHeader } = React.useContext(TableContext);
  return (
    <thead
      ref={ref}
      className={[
        'border-b border-surface-border bg-surface-lighter/80',
        stickyHeader ? 'sticky top-0 z-10 backdrop-blur-sm' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </thead>
  );
});

TableHead.displayName = 'TableHead';

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(function TableBody(
  { className, children, ...rest },
  ref,
) {
  const { variant } = React.useContext(TableContext);
  return (
    <tbody
      ref={ref}
      className={[
        'divide-y divide-surface-border',
        variant === 'striped' ? '[&>tr:nth-child(even)]:bg-surface-lighter/50' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </tbody>
  );
});

TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(function TableFooter(
  { className, children, ...rest },
  ref,
) {
  return (
    <tfoot
      ref={ref}
      className={[
        'border-t border-surface-border bg-surface-lighter/50 font-medium',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </tfoot>
  );
});

TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { selected, className, children, ...rest },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={[
        'transition-colors duration-100',
        'hover:bg-surface-lighter/70',
        selected
          ? 'bg-primary-subtle/50 hover:bg-primary-subtle/70'
          : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(function TableHeaderCell(
  { sortable, sortDirection, onSort, className, children, ...rest },
  ref,
) {
  const { size } = React.useContext(TableContext);
  const s = sizeStyles[size];

  const content = sortable ? (
    <button
      type="button"
      onClick={onSort}
      className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors group"
    >
      {children}
      <svg
        className={[
          'w-3.5 h-3.5 transition-all duration-200',
          sortDirection ? 'text-text-secondary' : 'text-text-muted opacity-0 group-hover:opacity-100',
          sortDirection === 'desc' ? 'rotate-180' : '',
        ].join(' ')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  ) : (
    <span className="font-semibold uppercase tracking-wider text-text-tertiary">{children}</span>
  );

  return (
    <th
      ref={ref}
      className={[s.header, 'whitespace-nowrap', className].filter(Boolean).join(' ')}
      aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined}
      {...rest}
    >
      {content}
    </th>
  );
});

TableHeaderCell.displayName = 'TableHeaderCell';

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, children, ...rest },
  ref,
) {
  const { size } = React.useContext(TableContext);
  const s = sizeStyles[size];

  return (
    <td
      ref={ref}
      className={[s.cell, 'text-text-secondary', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </td>
  );
});

TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(function TableCaption(
  { className, children, ...rest },
  ref,
) {
  return (
    <caption
      ref={ref}
      className={['px-4 py-3 text-sm text-text-tertiary text-left', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </caption>
  );
});

TableCaption.displayName = 'TableCaption';
