import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Popover } from './Popover';

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

describe('Popover', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders trigger', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Content</p>
      </Popover>,
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('does not show content initially', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Popover content</p>
      </Popover>,
    );
    expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
  });

  it('shows content on click', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Popover content</p>
      </Popover>,
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('sets aria-expanded on trigger', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Content</p>
      </Popover>,
    );
    const trigger = screen.getByText('Click me');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Content</p>
      </Popover>,
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles on repeated clicks', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Content</p>
      </Popover>,
    );
    const trigger = screen.getByText('Click me');
    fireEvent.click(trigger);
    expect(screen.getByText('Content')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('has aria-haspopup on trigger', () => {
    render(
      <Popover trigger={<button>Click me</button>}>
        <p>Content</p>
      </Popover>,
    );
    expect(screen.getByText('Click me')).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
