import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HoverCard } from './HoverCard';

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('HoverCard', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders trigger', () => {
    render(
      <HoverCard trigger={<button>Hover me</button>}>
        <p>Card content</p>
      </HoverCard>,
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('does not show content initially', () => {
    render(
      <HoverCard trigger={<button>Hover me</button>}>
        <p>Card content</p>
      </HoverCard>,
    );
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('shows content on hover after delay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} openDelay={100}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(150));
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('does not show content before delay elapses', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} openDelay={200}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('hides content on mouse leave after close delay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} openDelay={0} closeDelay={100}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByText('Card content')).toBeInTheDocument();

    await user.unhover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('keeps card open when mouse moves from trigger to card', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} openDelay={0} closeDelay={300}>
        <p>Card content</p>
      </HoverCard>,
    );

    // Hover trigger to open
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByText('Card content')).toBeInTheDocument();

    // Leave trigger (starts close timer)
    await user.unhover(screen.getByText('Hover me'));

    // Enter card before close timer fires (cancels close)
    const card = screen.getByRole('tooltip');
    await user.hover(card);

    // Wait longer than closeDelay - card should still be visible
    await act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('does not show content when disabled', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} disabled openDelay={0}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('shows on focusin and hides on focusout', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} openDelay={0} closeDelay={0}>
        <p>Card content</p>
      </HoverCard>,
    );

    await act(async () => {
      screen.getByText('Hover me').focus();
    });
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByText('Card content')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('Hover me').blur();
    });
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('sets aria-describedby when open', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} openDelay={0}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByText('Hover me')).toHaveAttribute('aria-describedby');
  });

  it('accepts placement prop', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} placement="top" openDelay={0}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('applies size classes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(
      <HoverCard trigger={<button>Hover me</button>} size="lg" openDelay={0}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    const card = screen.getByRole('tooltip');
    expect(card.className).toContain('max-w-[420px]');
  });

  it('applies custom className', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <HoverCard trigger={<button>Hover me</button>} className="custom-class" openDelay={0}>
        <p>Card content</p>
      </HoverCard>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    const card = screen.getByRole('tooltip');
    expect(card.className).toContain('custom-class');
  });
});
