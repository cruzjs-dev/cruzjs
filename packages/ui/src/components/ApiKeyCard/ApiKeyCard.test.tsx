import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiKeyCard } from './ApiKeyCard';

const defaultProps = {
  name: 'Production API Key',
  keyValue: 'sk_live_abc123def456',
  createdAt: 'Jan 15, 2026',
};

describe('ApiKeyCard', () => {
  it('renders key name', () => {
    render(<ApiKeyCard {...defaultProps} />);
    expect(screen.getByText('Production API Key')).toBeInTheDocument();
  });

  it('renders masked key by default', () => {
    render(<ApiKeyCard {...defaultProps} />);
    expect(screen.getByText('••••••••f456')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<ApiKeyCard {...defaultProps} status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('calls onCopy when copy clicked', () => {
    const handleCopy = vi.fn();
    render(<ApiKeyCard {...defaultProps} onCopy={handleCopy} />);
    fireEvent.click(screen.getByLabelText('Copy key'));
    expect(handleCopy).toHaveBeenCalledOnce();
  });

  it('calls onRevoke when revoke clicked', () => {
    const handleRevoke = vi.fn();
    render(<ApiKeyCard {...defaultProps} onRevoke={handleRevoke} />);
    fireEvent.click(screen.getByText('Revoke'));
    expect(handleRevoke).toHaveBeenCalledOnce();
  });

  it('calls onToggleMask when eye icon clicked', () => {
    const handleToggle = vi.fn();
    render(<ApiKeyCard {...defaultProps} onToggleMask={handleToggle} />);
    fireEvent.click(screen.getByLabelText('Show key'));
    expect(handleToggle).toHaveBeenCalledOnce();
  });

  it('renders metadata (createdAt, lastUsed)', () => {
    render(<ApiKeyCard {...defaultProps} lastUsed="2 hours ago" />);
    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('renders scopes', () => {
    render(<ApiKeyCard {...defaultProps} scopes={['read', 'write']} />);
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();
  });

  it('renders revoked state with reduced opacity', () => {
    const { container } = render(<ApiKeyCard {...defaultProps} status="revoked" />);
    expect(container.firstElementChild?.className).toContain('opacity-60');
  });

  it('hides actions when revoked', () => {
    const handleRevoke = vi.fn();
    render(<ApiKeyCard {...defaultProps} status="revoked" onRevoke={handleRevoke} />);
    expect(screen.queryByText('Revoke')).not.toBeInTheDocument();
  });

  it('renders expiresAt', () => {
    render(<ApiKeyCard {...defaultProps} expiresAt="Dec 31, 2026" />);
    expect(screen.getByText('Dec 31, 2026')).toBeInTheDocument();
  });
});
