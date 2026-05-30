import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from './Badge';
import type { BadgeVariant, BadgeColor } from './Badge';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Badge -- renders with correct text', () => {
  it('renders children text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders with default variant and color', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// ─── Variant Rendering ──────────────────────────────────────────────────────

describe('Badge -- variants', () => {
  it.each<BadgeVariant>(['solid', 'outline', 'subtle'])(
    'renders %s variant without crashing',
    (variant) => {
      const { container } = render(<Badge variant={variant}>Test</Badge>);
      expect(container.firstChild).toBeInTheDocument();
    },
  );
});

// ─── Color Rendering ────────────────────────────────────────────────────────

describe('Badge -- colors', () => {
  it.each<BadgeColor>(['primary', 'success', 'warning', 'danger', 'info', 'neutral'])(
    'renders %s color without crashing',
    (color) => {
      const { container } = render(<Badge color={color}>Test</Badge>);
      expect(container.firstChild).toBeInTheDocument();
    },
  );
});

// ─── Dot Variant ────────────────────────────────────────────────────────────

describe('Badge -- dot variant', () => {
  it('renders as a small circle with no text content', () => {
    const { container } = render(<Badge dot data-testid="dot-badge" />);
    const el = screen.getByTestId('dot-badge');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toBe('');
  });

  it('applies rounded-full class for dot', () => {
    const { container } = render(<Badge dot data-testid="dot-badge" />);
    const el = screen.getByTestId('dot-badge');
    expect(el).toHaveClass('rounded-full');
  });

  it('ignores children when dot is true', () => {
    render(<Badge dot>Should not appear</Badge>);
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });
});

// ─── Count Display ──────────────────────────────────────────────────────────

describe('Badge -- count display', () => {
  it('displays the count number', () => {
    render(<Badge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays count as string', () => {
    render(<Badge count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

// ─── maxCount Overflow ──────────────────────────────────────────────────────

describe('Badge -- maxCount', () => {
  it('shows "99+" when count exceeds default maxCount', () => {
    render(<Badge count={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows exact count when equal to maxCount', () => {
    render(<Badge count={99} />);
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('shows custom maxCount overflow', () => {
    render(<Badge count={10} maxCount={9} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows count when below custom maxCount', () => {
    render(<Badge count={5} maxCount={9} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('Badge -- className merging', () => {
  it('merges custom className', () => {
    const { container } = render(<Badge className="custom-class">Styled</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('preserves default classes when custom className is added', () => {
    const { container } = render(<Badge className="custom-class">Styled</Badge>);
    expect(container.firstChild).toHaveClass('rounded-full');
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Badge -- ref forwarding', () => {
  it('forwards ref to the root span element', () => {
    const ref = { current: null as HTMLSpanElement | null };
    render(<Badge ref={ref}>With ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('forwards ref for dot variant', () => {
    const ref = { current: null as HTMLSpanElement | null };
    render(<Badge ref={ref} dot />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});

// ─── onClick ────────────────────────────────────────────────────────────────

describe('Badge -- onClick', () => {
  it('fires onClick when provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Clickable</Badge>);
    await user.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('adds cursor-pointer class when onClick is provided', () => {
    const { container } = render(<Badge onClick={() => {}}>Clickable</Badge>);
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('does not add cursor-pointer when onClick is not provided', () => {
    const { container } = render(<Badge>Not clickable</Badge>);
    expect(container.firstChild).not.toHaveClass('cursor-pointer');
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('Badge -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<Badge data-testid="my-badge" id="badge-1">Content</Badge>);
    const el = screen.getByTestId('my-badge');
    expect(el).toHaveAttribute('id', 'badge-1');
  });
});
