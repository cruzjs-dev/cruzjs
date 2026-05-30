import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

// ─── Title Rendering ─────────────────────────────────────────────────────────

describe('EmptyState -- title', () => {
  it('renders the title text', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders the title as an h3 element', () => {
    render(<EmptyState title="Empty" />);
    const heading = screen.getByText('Empty');
    expect(heading.tagName).toBe('H3');
  });
});

// ─── Description ─────────────────────────────────────────────────────────────

describe('EmptyState -- description', () => {
  it('renders description text when provided', () => {
    render(<EmptyState title="Empty" description="Try adding some items" />);
    expect(screen.getByText('Try adding some items')).toBeInTheDocument();
  });

  it('does not render description element when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

// ─── Icon ────────────────────────────────────────────────────────────────────

describe('EmptyState -- icon', () => {
  it('renders custom icon when provided', () => {
    render(
      <EmptyState
        title="No data"
        icon={<span data-testid="custom-icon">Icon</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('does not render icon wrapper when icon is not provided', () => {
    const { container } = render(<EmptyState title="No data" />);
    // The icon wrapper uses color-mix bg; no rounded-full element should exist
    const iconWrappers = container.querySelectorAll('.rounded-full');
    expect(iconWrappers.length).toBe(0);
  });
});

// ─── Action Button ───────────────────────────────────────────────────────────

describe('EmptyState -- action', () => {
  it('renders the primary action button', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick: handleClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Add Item' });
    expect(button).toBeInTheDocument();
  });

  it('fires onClick when the action button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Create', onClick: handleClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Create' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders solid variant by default', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add', onClick: vi.fn() }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Add' });
    expect(button.className).toContain('bg-primary');
  });

  it('renders outline variant when specified', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add', onClick: vi.fn(), variant: 'outline' }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Add' });
    expect(button.className).toContain('ring-1');
    expect(button.className).not.toContain('bg-primary');
  });

  it('does not render action area when no action is provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});

// ─── Secondary Action ────────────────────────────────────────────────────────

describe('EmptyState -- secondaryAction', () => {
  it('renders the secondary action button', () => {
    render(
      <EmptyState
        title="No items"
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
      <EmptyState
        title="No items"
        secondaryAction={{ label: 'Help', onClick: handleClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Help' });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders both action and secondary action together', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Create', onClick: vi.fn() }}
        secondaryAction={{ label: 'Import', onClick: vi.fn() }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });
});

// ─── Sizes ───────────────────────────────────────────────────────────────────

describe('EmptyState -- sizes', () => {
  it('applies sm size classes', () => {
    const { container } = render(<EmptyState title="Small" size="sm" />);
    expect(container.firstElementChild?.className).toContain('py-6');
  });

  it('applies md size classes (default)', () => {
    const { container } = render(<EmptyState title="Medium" />);
    expect(container.firstElementChild?.className).toContain('py-10');
  });

  it('applies lg size classes', () => {
    const { container } = render(<EmptyState title="Large" size="lg" />);
    expect(container.firstElementChild?.className).toContain('py-16');
  });
});

// ─── Children Slot ───────────────────────────────────────────────────────────

describe('EmptyState -- children', () => {
  it('renders children content', () => {
    render(
      <EmptyState title="Empty">
        <div data-testid="custom-content">Custom content here</div>
      </EmptyState>,
    );
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom content here')).toBeInTheDocument();
  });
});

// ─── className ───────────────────────────────────────────────────────────────

describe('EmptyState -- className', () => {
  it('merges custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});

// ─── Ref Forwarding ──────────────────────────────────────────────────────────

describe('EmptyState -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<EmptyState ref={ref} title="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML Attributes ─────────────────────────────────────────────────────────

describe('EmptyState -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<EmptyState title="Test" data-testid="empty-state" id="es-1" />);
    const el = screen.getByTestId('empty-state');
    expect(el).toHaveAttribute('id', 'es-1');
  });
});
