import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamRoster, type TeamMember } from './TeamRoster';

const makeMembers = (count: number): TeamMember[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i === 0 ? 'Owner' : 'Member',
    status: 'active' as const,
  }));

const sampleMembers: TeamMember[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Owner', status: 'active' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Admin', status: 'pending' },
  { id: '3', name: 'Carol White', email: 'carol@example.com', role: 'Member', status: 'inactive' },
];

describe('TeamRoster', () => {
  it('renders member names', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('renders member emails', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('carol@example.com')).toBeInTheDocument();
  });

  it('renders role badges', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('renders member count', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });

  it('renders singular member count', () => {
    render(<TeamRoster members={[sampleMembers[0]]} />);
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('calls onInvite when invite clicked', () => {
    const onInvite = vi.fn();
    render(<TeamRoster members={sampleMembers} onInvite={onInvite} />);
    fireEvent.click(screen.getByText('Invite Member'));
    expect(onInvite).toHaveBeenCalledOnce();
  });

  it('renders custom invite label', () => {
    const onInvite = vi.fn();
    render(<TeamRoster members={sampleMembers} onInvite={onInvite} inviteLabel="Add Person" />);
    expect(screen.getByText('Add Person')).toBeInTheDocument();
  });

  it('calls onRemove when remove clicked', () => {
    const onRemove = vi.fn();
    render(<TeamRoster members={sampleMembers} onRemove={onRemove} />);
    const removeButtons = screen.getAllByLabelText(/^Remove /);
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('hides remove for currentUserId', () => {
    const onRemove = vi.fn();
    render(<TeamRoster members={sampleMembers} onRemove={onRemove} currentUserId="1" />);
    // Alice (id=1) should not have a remove button
    expect(screen.queryByLabelText('Remove Alice Johnson')).not.toBeInTheDocument();
    // Bob and Carol should still have remove buttons
    expect(screen.getByLabelText('Remove Bob Smith')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Carol White')).toBeInTheDocument();
  });

  it('renders status indicators', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls onRoleChange when role changed', () => {
    const onRoleChange = vi.fn();
    const roles = ['Owner', 'Admin', 'Member'];
    render(<TeamRoster members={sampleMembers} onRoleChange={onRoleChange} roles={roles} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Admin' } });
    expect(onRoleChange).toHaveBeenCalledWith('1', 'Admin');
  });

  it('shows loading state', () => {
    render(<TeamRoster members={sampleMembers} loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Members should not be visible when loading
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
  });

  it('shows empty message', () => {
    render(<TeamRoster members={[]} emptyMessage="No members found" />);
    expect(screen.getByText('No members found')).toBeInTheDocument();
  });

  it('shows default empty message', () => {
    render(<TeamRoster members={[]} />);
    expect(screen.getByText('No team members yet.')).toBeInTheDocument();
  });

  it('filters members when searchable', () => {
    render(<TeamRoster members={sampleMembers} searchable />);
    const searchInput = screen.getByPlaceholderText('Search members...');

    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
  });

  it('filters members by email when searchable', () => {
    render(<TeamRoster members={sampleMembers} searchable />);
    const searchInput = screen.getByPlaceholderText('Search members...');

    fireEvent.change(searchInput, { target: { value: 'bob@' } });
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('does not render search input when searchable is false', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.queryByPlaceholderText('Search members...')).not.toBeInTheDocument();
  });

  it('does not render invite button when onInvite is not provided', () => {
    render(<TeamRoster members={sampleMembers} />);
    expect(screen.queryByText('Invite Member')).not.toBeInTheDocument();
  });

  it('renders role as select when roles and onRoleChange provided', () => {
    const onRoleChange = vi.fn();
    const roles = ['Owner', 'Admin', 'Member'];
    render(<TeamRoster members={sampleMembers} onRoleChange={onRoleChange} roles={roles} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(3);
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    render(<TeamRoster ref={ref} members={[]} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
