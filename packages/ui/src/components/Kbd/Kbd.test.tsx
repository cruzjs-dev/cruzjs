import { render, screen } from '@testing-library/react';
import { Kbd } from './Kbd';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Kbd -- renders kbd element', () => {
  it('renders a <kbd> element', () => {
    const { container } = render(<Kbd>K</Kbd>);
    expect(container.querySelector('kbd')).toBeInTheDocument();
  });
});

// ─── Single Key from Children ───────────────────────────────────────────────

describe('Kbd -- renders single key from children', () => {
  it('renders children text', () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders emoji key from children', () => {
    render(<Kbd>Esc</Kbd>);
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });
});

// ─── Multiple Keys from Array ───────────────────────────────────────────────

describe('Kbd -- renders multiple keys from keys array', () => {
  it('renders each key in its own span', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'C']} />);
    const spans = container.querySelectorAll('kbd > span');
    // 2 key spans + 1 separator span = 3 total spans, but wrapped in fragments
    // Each key is in a span with keyCap class
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders default separator between keys', () => {
    render(<Kbd keys={['Ctrl', 'C']} />);
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('renders three keys with two separators', () => {
    render(<Kbd keys={['Ctrl', 'Shift', 'P']} />);
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Shift')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getAllByText('+')).toHaveLength(2);
  });
});

// ─── Separator Between Keys ─────────────────────────────────────────────────

describe('Kbd -- renders separator between keys', () => {
  it('renders custom separator', () => {
    render(<Kbd keys={['G', 'D']} separator="then" />);
    expect(screen.getByText('then')).toBeInTheDocument();
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });

  it('does not render separator for single key in array', () => {
    const { container } = render(<Kbd keys={['Esc']} />);
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });
});

// ─── Size Classes ───────────────────────────────────────────────────────────

describe('Kbd -- applies size classes', () => {
  it('applies sm size classes', () => {
    const { container } = render(<Kbd size="sm">K</Kbd>);
    const kbd = container.querySelector('kbd')!;
    expect(kbd).toHaveClass('px-1');
    expect(kbd).toHaveClass('py-0.5');
    expect(kbd).toHaveClass('text-[10px]');
  });

  it('applies md size classes by default', () => {
    const { container } = render(<Kbd>K</Kbd>);
    const kbd = container.querySelector('kbd')!;
    expect(kbd).toHaveClass('px-1.5');
    expect(kbd).toHaveClass('text-xs');
  });

  it('applies lg size classes', () => {
    const { container } = render(<Kbd size="lg">K</Kbd>);
    const kbd = container.querySelector('kbd')!;
    expect(kbd).toHaveClass('px-2');
    expect(kbd).toHaveClass('py-1');
    expect(kbd).toHaveClass('text-sm');
  });

  it('applies size to key caps in keys mode', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'K']} size="lg" />);
    const keySpans = container.querySelectorAll('span.font-mono');
    expect(keySpans.length).toBe(2);
    keySpans.forEach((span) => {
      expect(span).toHaveClass('px-2');
      expect(span).toHaveClass('text-sm');
    });
  });
});

// ─── Custom ClassName ───────────────────────────────────────────────────────

describe('Kbd -- supports custom className', () => {
  it('merges custom className on simple mode', () => {
    const { container } = render(<Kbd className="custom-class">K</Kbd>);
    const kbd = container.querySelector('kbd')!;
    expect(kbd).toHaveClass('custom-class');
    expect(kbd).toHaveClass('font-mono');
  });

  it('merges custom className on keys mode', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'K']} className="my-extra" />);
    const kbd = container.querySelector('kbd')!;
    expect(kbd).toHaveClass('my-extra');
    expect(kbd).toHaveClass('inline-flex');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Kbd -- ref forwarding', () => {
  it('forwards ref to the kbd element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<Kbd ref={ref}>K</Kbd>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('KBD');
  });

  it('forwards ref in keys mode', () => {
    const ref = { current: null as HTMLElement | null };
    render(<Kbd ref={ref} keys={['Ctrl', 'K']} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('KBD');
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('Kbd -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<Kbd data-testid="my-kbd" id="kbd-1">K</Kbd>);
    const el = screen.getByTestId('my-kbd');
    expect(el).toHaveAttribute('id', 'kbd-1');
  });
});
