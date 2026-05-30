import { render, screen } from '@testing-library/react';
import { Divider } from './Divider';

// --- Basic Rendering ---

describe('Divider -- renders with separator role', () => {
  it('renders with role="separator"', () => {
    render(<Divider data-testid="divider" />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

// --- Orientation ---

describe('Divider -- orientation', () => {
  it('renders horizontal by default', () => {
    render(<Divider />);
    const el = screen.getByRole('separator');
    expect(el).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders vertical when orientation="vertical"', () => {
    render(<Divider orientation="vertical" />);
    const el = screen.getByRole('separator');
    expect(el).toHaveAttribute('aria-orientation', 'vertical');
    expect(el).toHaveClass('border-l');
  });
});

// --- Label ---

describe('Divider -- label', () => {
  it('renders label text', () => {
    render(<Divider label="OR" />);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders without label by default', () => {
    const { container } = render(<Divider />);
    expect(container.firstChild).toHaveClass('border-t');
  });
});

// --- Variant ---

describe('Divider -- variant', () => {
  it('applies border-dashed class for dashed variant', () => {
    render(<Divider variant="dashed" />);
    const el = screen.getByRole('separator');
    expect(el).toHaveClass('border-dashed');
  });

  it('applies border-dotted class for dotted variant', () => {
    render(<Divider variant="dotted" />);
    const el = screen.getByRole('separator');
    expect(el).toHaveClass('border-dotted');
  });

  it('applies border-solid class by default', () => {
    render(<Divider />);
    const el = screen.getByRole('separator');
    expect(el).toHaveClass('border-solid');
  });
});

// --- Custom className ---

describe('Divider -- className merging', () => {
  it('supports custom className', () => {
    render(<Divider className="custom-divider" />);
    const el = screen.getByRole('separator');
    expect(el).toHaveClass('custom-divider');
  });

  it('preserves default classes when custom className is added', () => {
    render(<Divider className="custom-divider" />);
    const el = screen.getByRole('separator');
    expect(el).toHaveClass('border-t');
    expect(el).toHaveClass('custom-divider');
  });
});

// --- Ref Forwarding ---

describe('Divider -- ref forwarding', () => {
  it('forwards ref to the root div element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Divider ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// --- HTML Attributes ---

describe('Divider -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<Divider data-testid="my-divider" id="divider-1" />);
    const el = screen.getByTestId('my-divider');
    expect(el).toHaveAttribute('id', 'divider-1');
  });
});
