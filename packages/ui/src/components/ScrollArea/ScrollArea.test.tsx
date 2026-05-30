import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from './ScrollArea';

// --- Basic Rendering ---

describe('ScrollArea -- renders children', () => {
  it('renders children content', () => {
    render(
      <ScrollArea>
        <p>Scrollable content</p>
      </ScrollArea>,
    );
    expect(screen.getByText('Scrollable content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <ScrollArea>
        <p>First</p>
        <p>Second</p>
        <p>Third</p>
      </ScrollArea>,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('has role region', () => {
    render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(screen.getByLabelText('Scrollable content')).toBeInTheDocument();
  });
});

// --- Max Height ---

describe('ScrollArea -- applies maxHeight', () => {
  it('applies maxHeight as number (converts to px)', () => {
    const { container } = render(
      <ScrollArea maxHeight={200}>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveStyle({ maxHeight: '200px' });
  });

  it('applies maxHeight as string', () => {
    const { container } = render(
      <ScrollArea maxHeight="50vh">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveStyle({ maxHeight: '50vh' });
  });

  it('does not set maxHeight when not provided', () => {
    const { container } = render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.maxHeight).toBe('');
  });
});

// --- Scrollable Content ---

describe('ScrollArea -- scrollable content', () => {
  it('has tabIndex for keyboard scrolling', () => {
    const { container } = render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveAttribute('tabindex', '0');
  });
});

// --- Custom className ---

describe('ScrollArea -- custom className', () => {
  it('merges custom className', () => {
    const { container } = render(
      <ScrollArea className="custom-class">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('scroll-area');
  });
});

// --- Orientation Classes ---

describe('ScrollArea -- orientation classes', () => {
  it('applies vertical orientation class by default', () => {
    const { container } = render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveClass('scroll-area-vertical');
  });

  it('applies horizontal orientation class', () => {
    const { container } = render(
      <ScrollArea orientation="horizontal">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveClass('scroll-area-horizontal');
  });

  it('applies both orientation class', () => {
    const { container } = render(
      <ScrollArea orientation="both">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveClass('scroll-area-both');
  });
});

// --- Ref Forwarding ---

describe('ScrollArea -- ref forwarding', () => {
  it('forwards ref to the root div element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <ScrollArea ref={ref}>
        <p>Content</p>
      </ScrollArea>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// --- Custom Style ---

describe('ScrollArea -- custom style', () => {
  it('merges custom style with maxHeight', () => {
    const { container } = render(
      <ScrollArea maxHeight={300} style={{ padding: '16px' }}>
        <p>Content</p>
      </ScrollArea>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.maxHeight).toBe('300px');
    expect(el.style.padding).toBe('16px');
  });
});
