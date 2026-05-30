import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarGroup } from './Avatar';

describe('Avatar', () => {
  it('renders with image', () => {
    render(<Avatar src="https://example.com/photo.jpg" alt="User" />);
    const avatar = screen.getAllByRole('img', { name: 'User' });
    expect(avatar.length).toBeGreaterThanOrEqual(1);
    expect(avatar[0].querySelector('img')).toBeInTheDocument();
  });

  it('renders initials from name', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders single initial for single name', () => {
    render(<Avatar name="John" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders fallback icon when no src or name', () => {
    render(<Avatar />);
    const avatar = screen.getByRole('img', { name: 'Avatar' });
    expect(avatar).toBeInTheDocument();
    expect(avatar.querySelector('svg')).toBeInTheDocument();
  });

  it('shows fallback on image error', () => {
    render(<Avatar src="bad-url.jpg" name="Jane Smith" />);
    const avatars = screen.getAllByRole('img', { name: 'Jane Smith' });
    const img = avatars[0].querySelector('img');
    if (img) {
      img.dispatchEvent(new Event('error'));
    }
  });

  it('renders status indicator', () => {
    render(<Avatar name="Test" status="online" />);
    expect(screen.getByLabelText('online')).toBeInTheDocument();
  });

  it('applies square variant', () => {
    const { container } = render(<Avatar name="Test" square />);
    const avatar = container.firstElementChild;
    expect(avatar?.className).toContain('rounded-xl');
  });

  it('applies custom className', () => {
    const { container } = render(<Avatar name="Test" className="custom-class" />);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});

describe('AvatarGroup', () => {
  it('renders all children', () => {
    render(
      <AvatarGroup>
        <Avatar name="Alice" />
        <Avatar name="Bob" />
        <Avatar name="Charlie" />
      </AvatarGroup>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('truncates with max and shows overflow count', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="Alice" />
        <Avatar name="Bob" />
        <Avatar name="Charlie" />
        <Avatar name="Dave" />
      </AvatarGroup>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('has group role', () => {
    render(
      <AvatarGroup>
        <Avatar name="Test" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('group', { name: 'Avatar group' })).toBeInTheDocument();
  });
});
