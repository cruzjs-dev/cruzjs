import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionDenied } from './PermissionDenied';

// ─── Title rendering ────────────────────────────────────────────────────────

describe('PermissionDenied -- title', () => {
  it('renders the default title "Access Denied"', () => {
    render(<PermissionDenied message="You do not have permission." />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<PermissionDenied title="Forbidden" message="Not allowed." />);
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });

  it('renders the title as an h3 element', () => {
    render(<PermissionDenied message="Denied." />);
    const heading = screen.getByText('Access Denied');
    expect(heading.tagName).toBe('H3');
  });
});

// ─── Message ────────────────────────────────────────────────────────────────

describe('PermissionDenied -- message', () => {
  it('renders the message text', () => {
    render(<PermissionDenied message="You need admin access." />);
    expect(screen.getByText('You need admin access.')).toBeInTheDocument();
  });
});

// ─── Default icon ───────────────────────────────────────────────────────────

describe('PermissionDenied -- default icon', () => {
  it('renders a default SVG lock icon', () => {
    const { container } = render(<PermissionDenied message="Denied." />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('wraps the icon in a tonal circle', () => {
    const { container } = render(<PermissionDenied message="Denied." />);
    const iconWrap = container.querySelector('.rounded-full');
    expect(iconWrap).toBeInTheDocument();
    expect((iconWrap as HTMLElement).style.backgroundColor).toContain('color-mix');
  });
});

// ─── Custom icon ────────────────────────────────────────────────────────────

describe('PermissionDenied -- custom icon', () => {
  it('renders a custom icon when provided', () => {
    render(
      <PermissionDenied
        message="Denied."
        icon={<span data-testid="custom-icon">X</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('does not render the default icon when custom icon is provided', () => {
    const { container } = render(
      <PermissionDenied
        message="Denied."
        icon={<span data-testid="custom-icon">X</span>}
      />,
    );
    // Custom icon replaces default SVG; the only SVG should not exist
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(0);
  });
});

// ─── Action button ──────────────────────────────────────────────────────────

describe('PermissionDenied -- action', () => {
  it('renders the primary action button', () => {
    render(
      <PermissionDenied
        message="Denied."
        action={{ label: 'Go Back', onClick: vi.fn() }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Go Back' });
    expect(button).toBeInTheDocument();
  });

  it('fires onClick when the action button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <PermissionDenied
        message="Denied."
        action={{ label: 'Return', onClick: handleClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Return' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a solid button with bg-primary', () => {
    render(
      <PermissionDenied
        message="Denied."
        action={{ label: 'Action', onClick: vi.fn() }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button.className).toContain('bg-primary');
  });

  it('does not render action area when no action is provided', () => {
    const { container } = render(<PermissionDenied message="Denied." />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});

// ─── Secondary action ───────────────────────────────────────────────────────

describe('PermissionDenied -- secondaryAction', () => {
  it('renders the secondary action button', () => {
    render(
      <PermissionDenied
        message="Denied."
        secondaryAction={{ label: 'Learn More', onClick: vi.fn() }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Learn More' });
    expect(button).toBeInTheDocument();
  });

  it('fires onClick when the secondary action is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <PermissionDenied
        message="Denied."
        secondaryAction={{ label: 'Help', onClick: handleClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Help' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders both primary and secondary actions together', () => {
    render(
      <PermissionDenied
        message="Denied."
        action={{ label: 'Go Home', onClick: vi.fn() }}
        secondaryAction={{ label: 'Contact Admin', onClick: vi.fn() }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact Admin' })).toBeInTheDocument();
  });
});

// ─── Sizes ──────────────────────────────────────────────────────────────────

describe('PermissionDenied -- sizes', () => {
  it('applies sm size classes', () => {
    const { container } = render(<PermissionDenied message="Denied." size="sm" />);
    expect(container.firstElementChild?.className).toContain('py-6');
  });

  it('applies md size classes (default)', () => {
    const { container } = render(<PermissionDenied message="Denied." />);
    expect(container.firstElementChild?.className).toContain('py-10');
  });

  it('applies lg size classes', () => {
    const { container } = render(<PermissionDenied message="Denied." size="lg" />);
    expect(container.firstElementChild?.className).toContain('py-16');
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('PermissionDenied -- className', () => {
  it('merges custom className', () => {
    const { container } = render(
      <PermissionDenied message="Denied." className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('PermissionDenied -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<PermissionDenied ref={ref} message="Denied." />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML attributes ────────────────────────────────────────────────────────

describe('PermissionDenied -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<PermissionDenied message="Denied." data-testid="perm-denied" id="pd-1" />);
    const el = screen.getByTestId('perm-denied');
    expect(el).toHaveAttribute('id', 'pd-1');
  });
});
