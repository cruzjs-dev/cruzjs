import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Banner } from './Banner';
import type { BannerVariant } from './Banner';

// ─── Children Rendering ──────────────────────────────────────────────────────

describe('Banner -- children', () => {
  it('renders children text', () => {
    render(<Banner>Announcement message</Banner>);
    expect(screen.getByText('Announcement message')).toBeInTheDocument();
  });
});

// ─── Icon ────────────────────────────────────────────────────────────────────

describe('Banner -- icon', () => {
  it('renders icon when provided', () => {
    render(
      <Banner icon={<span data-testid="custom-icon">!</span>}>
        With icon
      </Banner>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});

// ─── Action ──────────────────────────────────────────────────────────────────

describe('Banner -- action', () => {
  it('renders action element when provided', () => {
    render(
      <Banner action={<button data-testid="cta-btn">Learn more</button>}>
        With action
      </Banner>,
    );
    expect(screen.getByTestId('cta-btn')).toBeInTheDocument();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });
});

// ─── Dismiss Button ──────────────────────────────────────────────────────────

describe('Banner -- dismiss', () => {
  it('shows dismiss button when dismissible is true', () => {
    render(<Banner dismissible>Closeable</Banner>);
    expect(screen.getByRole('button', { name: 'Dismiss banner' })).toBeInTheDocument();
  });

  it('does not show dismiss button when dismissible is false', () => {
    render(<Banner>Not closeable</Banner>);
    expect(screen.queryByRole('button', { name: 'Dismiss banner' })).not.toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(
      <Banner dismissible onDismiss={handleDismiss}>
        Closeable
      </Banner>,
    );
    await user.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides the banner after dismiss (internal state)', async () => {
    const user = userEvent.setup();
    render(<Banner dismissible>Will disappear</Banner>);

    await user.click(screen.getByRole('button', { name: 'Dismiss banner' }));

    // After the animation timeout the element should be removed from the DOM
    await waitFor(() => {
      expect(screen.queryByText('Will disappear')).not.toBeInTheDocument();
    });
  });
});

// ─── Variant Classes ─────────────────────────────────────────────────────────

describe('Banner -- variants', () => {
  it.each<{ variant: BannerVariant; expectedClass: string }>([
    { variant: 'info', expectedClass: 'bg-info-subtle' },
    { variant: 'success', expectedClass: 'bg-success-subtle' },
    { variant: 'warning', expectedClass: 'bg-warning-subtle' },
    { variant: 'primary', expectedClass: 'bg-primary' },
  ])('applies $expectedClass for $variant variant', ({ variant, expectedClass }) => {
    const { container } = render(<Banner variant={variant}>Test</Banner>);
    expect(container.firstChild).toHaveClass(expectedClass);
  });

  it.each<{ variant: BannerVariant; expectedAttr: string }>([
    { variant: 'info', expectedAttr: 'info' },
    { variant: 'success', expectedAttr: 'success' },
    { variant: 'warning', expectedAttr: 'warning' },
    { variant: 'primary', expectedAttr: 'primary' },
  ])('sets data-variant=$expectedAttr for $variant variant', ({ variant, expectedAttr }) => {
    const { container } = render(<Banner variant={variant}>Test</Banner>);
    expect(container.firstChild).toHaveAttribute('data-variant', expectedAttr);
  });
});

// ─── Position ────────────────────────────────────────────────────────────────

describe('Banner -- position', () => {
  it('sets data-position="top" by default', () => {
    const { container } = render(<Banner>Top banner</Banner>);
    expect(container.firstChild).toHaveAttribute('data-position', 'top');
  });

  it('sets data-position="bottom" when position is bottom', () => {
    const { container } = render(<Banner position="bottom">Bottom banner</Banner>);
    expect(container.firstChild).toHaveAttribute('data-position', 'bottom');
  });
});

// ─── Sticky ──────────────────────────────────────────────────────────────────

describe('Banner -- sticky', () => {
  it('applies sticky class when sticky is true', () => {
    const { container } = render(<Banner sticky>Sticky banner</Banner>);
    expect(container.firstChild).toHaveClass('sticky');
  });

  it('does not apply sticky class when sticky is false', () => {
    const { container } = render(<Banner>Non-sticky banner</Banner>);
    expect(container.firstChild).not.toHaveClass('sticky');
  });
});

// ─── Compact ─────────────────────────────────────────────────────────────────

describe('Banner -- compact', () => {
  it('applies compact sizing classes when compact is true', () => {
    const { container } = render(<Banner compact>Compact banner</Banner>);
    expect(container.firstChild).toHaveClass('text-xs');
    expect(container.firstChild).not.toHaveClass('text-sm');
  });

  it('applies default sizing classes when compact is false', () => {
    const { container } = render(<Banner>Default banner</Banner>);
    expect(container.firstChild).toHaveClass('text-sm');
    expect(container.firstChild).not.toHaveClass('text-xs');
  });
});

// ─── Custom className ────────────────────────────────────────────────────────

describe('Banner -- className', () => {
  it('merges custom className', () => {
    const { container } = render(<Banner className="my-custom-class">Content</Banner>);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});

// ─── Ref Forwarding ──────────────────────────────────────────────────────────

describe('Banner -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Banner ref={ref}>With ref</Banner>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('banner');
  });
});
