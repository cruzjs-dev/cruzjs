import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingWindow } from './FloatingWindow';

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

describe('FloatingWindow', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders when open', () => {
    render(
      <FloatingWindow open>
        Window content
      </FloatingWindow>,
    );
    expect(screen.getByTestId('floating-window')).toBeInTheDocument();
    expect(screen.getByText('Window content')).toBeInTheDocument();
  });

  it('does not render when not open', () => {
    render(
      <FloatingWindow open={false}>
        Hidden content
      </FloatingWindow>,
    );
    expect(screen.queryByTestId('floating-window')).not.toBeInTheDocument();
  });

  it('renders title text', () => {
    render(
      <FloatingWindow open title="My Panel">
        Content
      </FloatingWindow>,
    );
    expect(screen.getByText('My Panel')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FloatingWindow open>
        <div data-testid="child-element">Child here</div>
      </FloatingWindow>,
    );
    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByText('Child here')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow open onClose={onClose} title="Test">
        Content
      </FloatingWindow>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(
      <FloatingWindow open title="No Close">
        Content
      </FloatingWindow>,
    );
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('applies default position', () => {
    render(
      <FloatingWindow open defaultPosition={{ x: 200, y: 300 }}>
        Content
      </FloatingWindow>,
    );
    const el = screen.getByTestId('floating-window');
    expect(el.style.left).toBe('200px');
    expect(el.style.top).toBe('300px');
  });

  it('shows resize handle when resizable is true', () => {
    render(
      <FloatingWindow open resizable>
        Content
      </FloatingWindow>,
    );
    expect(screen.getByTestId('floating-window-resize')).toBeInTheDocument();
  });

  it('hides resize handle when resizable is false', () => {
    render(
      <FloatingWindow open resizable={false}>
        Content
      </FloatingWindow>,
    );
    expect(screen.queryByTestId('floating-window-resize')).not.toBeInTheDocument();
  });

  it('applies className prop', () => {
    render(
      <FloatingWindow open className="custom-class">
        Content
      </FloatingWindow>,
    );
    expect(screen.getByTestId('floating-window')).toHaveClass('custom-class');
  });

  it('has dialog role', () => {
    render(
      <FloatingWindow open title="Dialog Test">
        Content
      </FloatingWindow>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('applies default size', () => {
    render(
      <FloatingWindow open defaultSize={{ width: 500, height: 400 }}>
        Content
      </FloatingWindow>,
    );
    const el = screen.getByTestId('floating-window');
    expect(el.style.width).toBe('500px');
    expect(el.style.height).toBe('400px');
  });
});
