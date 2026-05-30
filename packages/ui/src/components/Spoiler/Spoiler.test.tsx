import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Spoiler } from './Spoiler';

// Mock ResizeObserver
const resizeObserverCallbacks: ResizeObserverCallback[] = [];

class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverCallbacks.push(callback);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

function mockElementDimensions(overflows: boolean, maxHeight = 80) {
  const scrollHeightValue = overflows ? maxHeight + 100 : maxHeight - 20;
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      return scrollHeightValue;
    },
  });
}

describe('Spoiler', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    resizeObserverCallbacks.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset scrollHeight to default
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 0;
      },
    });
  });

  it('renders children content', () => {
    mockElementDimensions(false);
    render(
      <Spoiler maxHeight={80}>
        <p>Hello world</p>
      </Spoiler>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('hides overflow content when collapsed', () => {
    mockElementDimensions(true, 80);
    render(
      <Spoiler maxHeight={80}>
        <p>Long content that overflows</p>
      </Spoiler>,
    );
    const content = screen.getByTestId('spoiler-content');
    expect(content.style.maxHeight).toBe('80px');
  });

  it('shows toggle button when content overflows', () => {
    mockElementDimensions(true, 80);
    render(
      <Spoiler maxHeight={80}>
        <p>Long content</p>
      </Spoiler>,
    );
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('toggles expanded state on click', () => {
    mockElementDimensions(true, 80);
    render(
      <Spoiler maxHeight={80}>
        <p>Long content</p>
      </Spoiler>,
    );
    const button = screen.getByRole('button', { name: 'Show more' });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('calls onExpandedChange callback', () => {
    mockElementDimensions(true, 80);
    const onExpandedChange = vi.fn();
    render(
      <Spoiler maxHeight={80} onExpandedChange={onExpandedChange}>
        <p>Long content</p>
      </Spoiler>,
    );
    const button = screen.getByRole('button', { name: 'Show more' });

    fireEvent.click(button);
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('works controlled', () => {
    mockElementDimensions(true, 80);
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <Spoiler maxHeight={80} expanded={false} onExpandedChange={onExpandedChange}>
        <p>Long content</p>
      </Spoiler>,
    );

    const button = screen.getByRole('button', { name: 'Show more' });
    fireEvent.click(button);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    // Still collapsed because parent hasn't updated the prop
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();

    // Parent updates prop
    rerender(
      <Spoiler maxHeight={80} expanded={true} onExpandedChange={onExpandedChange}>
        <p>Long content</p>
      </Spoiler>,
    );
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('hides toggle when content fits', () => {
    mockElementDimensions(false, 80);
    render(
      <Spoiler maxHeight={80}>
        <p>Short content</p>
      </Spoiler>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('supports custom labels', () => {
    mockElementDimensions(true, 80);
    render(
      <Spoiler maxHeight={80} showLabel="Read more" hideLabel="Read less">
        <p>Long content</p>
      </Spoiler>,
    );
    expect(screen.getByRole('button', { name: 'Read more' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
    expect(screen.getByRole('button', { name: 'Read less' })).toBeInTheDocument();
  });
});
