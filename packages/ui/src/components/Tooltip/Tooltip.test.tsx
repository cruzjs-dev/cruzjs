import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Tooltip } from './Tooltip';

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

describe('Tooltip', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children without tooltip initially', () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter after delay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Help text" delayOpen={0}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Help text');
  });

  it('hides tooltip on mouse leave', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Help text" delayOpen={0} delayClose={0}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.unhover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not render when disabled', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Help text" disabled delayOpen={0}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('sets aria-describedby when open', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Help text" delayOpen={0}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText('Hover me'));
    await act(() => vi.advanceTimersByTime(50));
    expect(screen.getByText('Hover me')).toHaveAttribute('aria-describedby', 'cruz-tooltip');
  });
});
