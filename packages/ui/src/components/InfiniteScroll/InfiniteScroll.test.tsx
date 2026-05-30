import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InfiniteScroll } from './InfiniteScroll';

// ─── IntersectionObserver Mock ─────────────────────────────────────────────

const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

let capturedCallback: (entries: IntersectionObserverEntry[]) => void;

beforeEach(() => {
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();

  global.IntersectionObserver = vi.fn().mockImplementation(function (
    this: IntersectionObserver,
    callback: IntersectionObserverCallback,
  ) {
    capturedCallback = callback as unknown as (entries: IntersectionObserverEntry[]) => void;
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: () => [],
    };
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function simulateIntersection(isIntersecting: boolean) {
  capturedCallback([
    { isIntersecting } as IntersectionObserverEntry,
  ]);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('InfiniteScroll', () => {
  it('renders children', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore>
        <p>Item 1</p>
        <p>Item 2</p>
      </InfiniteScroll>,
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders the sentinel element', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.getByTestId('infinite-scroll-sentinel')).toBeInTheDocument();
  });

  it('observes the sentinel with IntersectionObserver', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(mockObserve).toHaveBeenCalledTimes(1);
    const sentinel = screen.getByTestId('infinite-scroll-sentinel');
    expect(mockObserve).toHaveBeenCalledWith(sentinel);
  });

  it('shows default loader when loading', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore loading>
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows custom loader when loading and loader prop is provided', () => {
    render(
      <InfiniteScroll
        onLoadMore={() => {}}
        hasMore
        loading
        loader={<div data-testid="custom-loader">Loading more...</div>}
      >
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not show loader when not loading', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows endMessage when hasMore is false and not loading', () => {
    render(
      <InfiniteScroll
        onLoadMore={() => {}}
        hasMore={false}
        endMessage={<p>No more items</p>}
      >
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.getByText('No more items')).toBeInTheDocument();
  });

  it('does not show endMessage when hasMore is true', () => {
    render(
      <InfiniteScroll
        onLoadMore={() => {}}
        hasMore
        endMessage={<p>No more items</p>}
      >
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.queryByText('No more items')).not.toBeInTheDocument();
  });

  it('does not show endMessage when loading', () => {
    render(
      <InfiniteScroll
        onLoadMore={() => {}}
        hasMore={false}
        loading
        endMessage={<p>No more items</p>}
      >
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(screen.queryByText('No more items')).not.toBeInTheDocument();
  });

  it('calls onLoadMore when sentinel intersects and hasMore is true', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll onLoadMore={onLoadMore} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );

    simulateIntersection(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore when loading is true', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll onLoadMore={onLoadMore} hasMore loading>
        <p>Content</p>
      </InfiniteScroll>,
    );

    simulateIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll onLoadMore={onLoadMore} hasMore={false}>
        <p>Content</p>
      </InfiniteScroll>,
    );

    simulateIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when sentinel is not intersecting', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll onLoadMore={onLoadMore} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );

    simulateIntersection(false);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <InfiniteScroll onLoadMore={() => {}} hasMore className="custom-scroll-class">
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(container.firstElementChild).toHaveClass('custom-scroll-class');
  });

  it('forwards ref to the container div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <InfiniteScroll ref={ref} onLoadMore={() => {}} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('passes rootMargin based on threshold', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore threshold={500}>
        <p>Content</p>
      </InfiniteScroll>,
    );
    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { rootMargin: '0px 0px 500px 0px' },
    );
  });

  it('disconnects observer on unmount', () => {
    const { unmount } = render(
      <InfiniteScroll onLoadMore={() => {}} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('sentinel has aria-hidden', () => {
    render(
      <InfiniteScroll onLoadMore={() => {}} hasMore>
        <p>Content</p>
      </InfiniteScroll>,
    );
    const sentinel = screen.getByTestId('infinite-scroll-sentinel');
    expect(sentinel).toHaveAttribute('aria-hidden', 'true');
  });
});
