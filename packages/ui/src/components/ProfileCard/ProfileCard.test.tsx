import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileCard } from './ProfileCard';

describe('ProfileCard', () => {
  it('renders name', () => {
    render(<ProfileCard name="Jane Doe" />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders role', () => {
    render(<ProfileCard name="Jane Doe" role="Engineer" />);
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('renders avatar', () => {
    render(<ProfileCard name="Jane Doe" avatarSrc="https://example.com/photo.jpg" />);
    const avatars = screen.getAllByRole('img', { name: 'Jane Doe' });
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });

  it('renders stats', () => {
    render(
      <ProfileCard
        name="Jane Doe"
        stats={[
          { label: 'Posts', value: 42 },
          { label: 'Followers', value: '1.2K' },
        ]}
      />,
    );
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('1.2K')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(
      <ProfileCard
        name="Jane Doe"
        actions={[
          { label: 'Follow', variant: 'solid' },
          { label: 'Message', variant: 'outline' },
        ]}
      />,
    );
    expect(screen.getByText('Follow')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('calls action onClick', () => {
    const handleClick = vi.fn();
    render(
      <ProfileCard
        name="Jane Doe"
        actions={[{ label: 'Follow', onClick: handleClick }]}
      />,
    );
    fireEvent.click(screen.getByText('Follow'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders compact variant', () => {
    const { container } = render(<ProfileCard name="Jane Doe" variant="compact" />);
    expect(container.firstElementChild?.className).toContain('w-64');
  });

  it('renders horizontal variant', () => {
    const { container } = render(<ProfileCard name="Jane Doe" variant="horizontal" />);
    const inner = container.firstElementChild?.firstElementChild;
    expect(inner?.className).toContain('flex');
    expect(inner?.className).toContain('items-center');
  });

  it('renders badge', () => {
    render(
      <ProfileCard
        name="Jane Doe"
        badge={<span data-testid="badge">Admin</span>}
      />,
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('supports custom className', () => {
    const { container } = render(<ProfileCard name="Jane Doe" className="custom-class" />);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});
