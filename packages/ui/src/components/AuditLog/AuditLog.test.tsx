import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuditLog } from './AuditLog';
import type { AuditLogEntry } from './AuditLog';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const baseEntries: AuditLogEntry[] = [
  {
    id: '1',
    user: { name: 'Alice Chen', email: 'alice@example.com', avatarSrc: '/alice.png' },
    action: 'created',
    resource: 'API Key',
    resourceId: 'key-1',
    description: 'Created a new production API key',
    timestamp: '2 hours ago',
    metadata: { ip: '192.168.1.1', browser: 'Chrome' },
    severity: 'info',
  },
  {
    id: '2',
    user: { name: 'Bob Smith' },
    action: 'updated',
    resource: 'Settings',
    description: 'Changed org display name',
    timestamp: '1 hour ago',
    severity: 'warning',
  },
  {
    id: '3',
    user: { name: 'Carol Davis', email: 'carol@example.com' },
    action: 'deleted',
    resource: 'Member',
    resourceId: 'mem-42',
    timestamp: '30 minutes ago',
    severity: 'danger',
  },
  {
    id: '4',
    user: { name: 'Dave Wilson' },
    action: 'invited',
    resource: 'Member',
    timestamp: '15 minutes ago',
  },
  {
    id: '5',
    user: { name: 'Eve Johnson' },
    action: 'created',
    resource: 'Webhook',
    timestamp: '10 minutes ago',
  },
  {
    id: '6',
    user: { name: 'Frank Lee' },
    action: 'updated',
    resource: 'API Key',
    timestamp: '5 minutes ago',
  },
  {
    id: '7',
    user: { name: 'Grace Kim' },
    action: 'deleted',
    resource: 'Settings',
    timestamp: '2 minutes ago',
  },
  {
    id: '8',
    user: { name: 'Henry Park' },
    action: 'created',
    resource: 'Member',
    timestamp: 'Just now',
  },
];

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('AuditLog -- renders entry user names', () => {
  it('renders all user names', () => {
    render(<AuditLog entries={baseEntries} showFilters={false} />);
    expect(screen.getByText('Alice Chen')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();
    expect(screen.getByText('Dave Wilson')).toBeInTheDocument();
  });
});

// ─── Action Badges ──────────────────────────────────────────────────────────

describe('AuditLog -- renders action badges', () => {
  it('renders action text in badges', () => {
    render(<AuditLog entries={baseEntries} showFilters={false} />);
    const badges = screen.getAllByTestId('audit-log-action-badge');
    expect(badges.length).toBeGreaterThanOrEqual(8);
    expect(badges[0]).toHaveTextContent('created');
    expect(badges[1]).toHaveTextContent('updated');
    expect(badges[2]).toHaveTextContent('deleted');
  });

  it('applies success style to created badge', () => {
    render(<AuditLog entries={[baseEntries[0]]} showFilters={false} />);
    const badge = screen.getByTestId('audit-log-action-badge');
    expect(badge).toHaveClass('bg-success-subtle');
    expect(badge).toHaveClass('text-success-text');
  });

  it('applies info style to updated badge', () => {
    render(<AuditLog entries={[baseEntries[1]]} showFilters={false} />);
    const badge = screen.getByTestId('audit-log-action-badge');
    expect(badge).toHaveClass('bg-info-subtle');
    expect(badge).toHaveClass('text-info');
  });

  it('applies danger style to deleted badge', () => {
    render(<AuditLog entries={[baseEntries[2]]} showFilters={false} />);
    const badge = screen.getByTestId('audit-log-action-badge');
    expect(badge).toHaveClass('bg-danger-subtle');
    expect(badge).toHaveClass('text-danger-text');
  });

  it('applies default style to unknown actions', () => {
    render(<AuditLog entries={[baseEntries[3]]} showFilters={false} />);
    const badge = screen.getByTestId('audit-log-action-badge');
    expect(badge).toHaveClass('bg-surface-lighter');
    expect(badge).toHaveClass('text-text-secondary');
  });
});

// ─── Resource Names ─────────────────────────────────────────────────────────

describe('AuditLog -- renders resource names', () => {
  it('renders resource text', () => {
    render(<AuditLog entries={baseEntries} showFilters={false} />);
    const resources = screen.getAllByTestId('audit-log-resource');
    expect(resources[0]).toHaveTextContent('API Key');
    expect(resources[1]).toHaveTextContent('Settings');
    expect(resources[2]).toHaveTextContent('Member');
  });
});

// ─── Timestamps ─────────────────────────────────────────────────────────────

describe('AuditLog -- renders timestamps', () => {
  it('renders timestamp text', () => {
    render(<AuditLog entries={baseEntries} showFilters={false} />);
    const timestamps = screen.getAllByTestId('audit-log-timestamp');
    expect(timestamps[0]).toHaveTextContent('2 hours ago');
    expect(timestamps[1]).toHaveTextContent('1 hour ago');
    expect(timestamps[2]).toHaveTextContent('30 minutes ago');
  });

  it('applies muted text style to timestamps', () => {
    render(<AuditLog entries={[baseEntries[0]]} showFilters={false} />);
    const timestamp = screen.getByTestId('audit-log-timestamp');
    expect(timestamp).toHaveClass('text-text-muted');
    expect(timestamp).toHaveClass('text-xs');
  });
});

// ─── Filter Bar ─────────────────────────────────────────────────────────────

describe('AuditLog -- renders filter bar when showFilters', () => {
  it('shows filter bar when showFilters=true and onFilterChange provided', () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLog entries={baseEntries} showFilters={true} onFilterChange={onFilterChange} />,
    );
    expect(screen.getByTestId('audit-log-filter-bar')).toBeInTheDocument();
  });

  it('hides filter bar when showFilters=false', () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLog entries={baseEntries} showFilters={false} onFilterChange={onFilterChange} />,
    );
    expect(screen.queryByTestId('audit-log-filter-bar')).not.toBeInTheDocument();
  });

  it('hides filter bar when onFilterChange is not provided', () => {
    render(<AuditLog entries={baseEntries} showFilters={true} />);
    expect(screen.queryByTestId('audit-log-filter-bar')).not.toBeInTheDocument();
  });
});

// ─── Filter Change ──────────────────────────────────────────────────────────

describe('AuditLog -- calls onFilterChange when filter changed', () => {
  it('calls onFilterChange when action filter changes', () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLog entries={baseEntries} showFilters={true} onFilterChange={onFilterChange} />,
    );
    const actionSelect = screen.getByTestId('audit-log-filter-action');
    fireEvent.change(actionSelect, { target: { value: 'created' } });
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ actions: ['created'] }),
    );
  });

  it('calls onFilterChange when user filter changes', () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLog entries={baseEntries} showFilters={true} onFilterChange={onFilterChange} />,
    );
    const userSelect = screen.getByTestId('audit-log-filter-user');
    fireEvent.change(userSelect, { target: { value: 'Alice Chen' } });
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ users: ['Alice Chen'] }),
    );
  });

  it('calls onFilterChange when resource filter changes', () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLog entries={baseEntries} showFilters={true} onFilterChange={onFilterChange} />,
    );
    const resourceSelect = screen.getByTestId('audit-log-filter-resource');
    fireEvent.change(resourceSelect, { target: { value: 'API Key' } });
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ resources: ['API Key'] }),
    );
  });

  it('clears filters when clear button clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <AuditLog
        entries={baseEntries}
        showFilters={true}
        filters={{ actions: ['created'] }}
        onFilterChange={onFilterChange}
      />,
    );
    const clearButton = screen.getByTestId('audit-log-filter-clear');
    fireEvent.click(clearButton);
    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});

// ─── Loading State ──────────────────────────────────────────────────────────

describe('AuditLog -- shows loading state', () => {
  it('renders loading spinner when loading=true', () => {
    render(<AuditLog entries={[]} loading={true} showFilters={false} />);
    expect(screen.getByTestId('audit-log-loading')).toBeInTheDocument();
  });

  it('hides entries when loading', () => {
    render(<AuditLog entries={baseEntries} loading={true} showFilters={false} />);
    expect(screen.queryByTestId('audit-log-entries')).not.toBeInTheDocument();
  });
});

// ─── Empty State ────────────────────────────────────────────────────────────

describe('AuditLog -- shows empty message', () => {
  it('renders default empty message when no entries', () => {
    render(<AuditLog entries={[]} showFilters={false} />);
    expect(screen.getByTestId('audit-log-empty')).toBeInTheDocument();
    expect(screen.getByText('No audit log entries')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(<AuditLog entries={[]} showFilters={false} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('does not show empty message when entries exist', () => {
    render(<AuditLog entries={baseEntries} showFilters={false} />);
    expect(screen.queryByTestId('audit-log-empty')).not.toBeInTheDocument();
  });
});

// ─── Severity Indicators ────────────────────────────────────────────────────

describe('AuditLog -- renders severity indicators', () => {
  it('applies info severity border', () => {
    render(<AuditLog entries={[baseEntries[0]]} showFilters={false} />);
    const entry = screen.getByTestId('audit-log-entry');
    expect(entry).toHaveClass('border-l-2');
    expect(entry).toHaveClass('border-l-info');
  });

  it('applies warning severity border', () => {
    render(<AuditLog entries={[baseEntries[1]]} showFilters={false} />);
    const entry = screen.getByTestId('audit-log-entry');
    expect(entry).toHaveClass('border-l-2');
    expect(entry).toHaveClass('border-l-warning');
  });

  it('applies danger severity border', () => {
    render(<AuditLog entries={[baseEntries[2]]} showFilters={false} />);
    const entry = screen.getByTestId('audit-log-entry');
    expect(entry).toHaveClass('border-l-2');
    expect(entry).toHaveClass('border-l-danger');
  });

  it('does not apply severity border when severity is not set', () => {
    render(<AuditLog entries={[baseEntries[3]]} showFilters={false} />);
    const entry = screen.getByTestId('audit-log-entry');
    expect(entry).not.toHaveClass('border-l-2');
  });
});

// ─── Entry Click ────────────────────────────────────────────────────────────

describe('AuditLog -- calls onEntryClick on row click', () => {
  it('calls onEntryClick with the entry when row is clicked', () => {
    const onEntryClick = vi.fn();
    render(
      <AuditLog entries={[baseEntries[0]]} showFilters={false} onEntryClick={onEntryClick} />,
    );
    const entry = screen.getByTestId('audit-log-entry');
    fireEvent.click(entry);
    expect(onEntryClick).toHaveBeenCalledWith(baseEntries[0]);
  });

  it('makes entry row a button role when onEntryClick provided', () => {
    const onEntryClick = vi.fn();
    render(
      <AuditLog entries={[baseEntries[0]]} showFilters={false} onEntryClick={onEntryClick} />,
    );
    const entry = screen.getByTestId('audit-log-entry');
    expect(entry).toHaveAttribute('role', 'button');
  });

  it('does not have button role when onEntryClick is not provided', () => {
    render(<AuditLog entries={[baseEntries[0]]} showFilters={false} />);
    const entry = screen.getByTestId('audit-log-entry');
    expect(entry).not.toHaveAttribute('role');
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

describe('AuditLog -- renders pagination', () => {
  it('renders pagination bar when pagination prop is provided', () => {
    const onPageChange = vi.fn();
    render(
      <AuditLog
        entries={baseEntries}
        showFilters={false}
        pagination={{ page: 1, pageSize: 10, total: 50, onPageChange }}
      />,
    );
    expect(screen.getByTestId('audit-log-pagination')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    const onPageChange = vi.fn();
    render(
      <AuditLog
        entries={baseEntries}
        showFilters={false}
        pagination={{ page: 1, pageSize: 10, total: 50, onPageChange }}
      />,
    );
    const prevButton = screen.getByTestId('audit-log-pagination-prev');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const onPageChange = vi.fn();
    render(
      <AuditLog
        entries={baseEntries}
        showFilters={false}
        pagination={{ page: 5, pageSize: 10, total: 50, onPageChange }}
      />,
    );
    const nextButton = screen.getByTestId('audit-log-pagination-next');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <AuditLog
        entries={baseEntries}
        showFilters={false}
        pagination={{ page: 2, pageSize: 10, total: 50, onPageChange }}
      />,
    );
    const nextButton = screen.getByTestId('audit-log-pagination-next');
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when previous is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <AuditLog
        entries={baseEntries}
        showFilters={false}
        pagination={{ page: 3, pageSize: 10, total: 50, onPageChange }}
      />,
    );
    const prevButton = screen.getByTestId('audit-log-pagination-prev');
    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('does not render pagination when prop is not provided', () => {
    render(<AuditLog entries={baseEntries} showFilters={false} />);
    expect(screen.queryByTestId('audit-log-pagination')).not.toBeInTheDocument();
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('AuditLog -- ref forwarding', () => {
  it('forwards ref on container', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<AuditLog ref={ref} entries={baseEntries} showFilters={false} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('AuditLog -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(
      <AuditLog data-testid="my-audit-log" id="log-1" entries={baseEntries} showFilters={false} />,
    );
    const el = screen.getByTestId('my-audit-log');
    expect(el).toHaveAttribute('id', 'log-1');
  });

  it('merges custom className on container', () => {
    const { container } = render(
      <AuditLog entries={baseEntries} showFilters={false} className="my-custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
    expect(container.firstElementChild).toHaveClass('bg-surface');
  });
});
