import { render, screen } from '@testing-library/react';
import { QRCode } from './QRCode';
import type { QRCodeErrorCorrection } from './QRCode';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('QRCode -- renders SVG', () => {
  it('renders an SVG element', () => {
    const { container } = render(<QRCode value="hello" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.tagName).toBe('svg');
  });

  it('has role="img" and an accessible label', () => {
    render(<QRCode value="https://example.com" />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-label', 'QR code for: https://example.com');
  });
});

// ─── Size ────────────────────────────────────────────────────────────────────

describe('QRCode -- size', () => {
  it('uses the default size of 200', () => {
    const { container } = render(<QRCode value="test" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '200');
  });

  it('applies a custom size', () => {
    const { container } = render(<QRCode value="test" size={300} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '300');
    expect(svg).toHaveAttribute('height', '300');
  });
});

// ─── Colors ──────────────────────────────────────────────────────────────────

describe('QRCode -- custom colors', () => {
  it('uses currentColor as default foreground', () => {
    const { container } = render(<QRCode value="test" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('fill', 'currentColor');
  });

  it('applies custom foreground color', () => {
    const { container } = render(<QRCode value="test" color="#ff0000" />);
    const g = container.querySelector('g');
    expect(g).toHaveAttribute('fill', '#ff0000');
  });

  it('renders a background rect when backgroundColor is not transparent', () => {
    const { container } = render(<QRCode value="test" backgroundColor="#ffffff" />);
    const rects = container.querySelectorAll('rect');
    // First rect should be the background
    const bgRect = rects[0];
    expect(bgRect).toHaveAttribute('fill', '#ffffff');
  });

  it('does not render a background rect when backgroundColor is transparent', () => {
    const { container } = render(<QRCode value="test" />);
    // All rects should be inside the <g> (module rects), none with fill attribute outside <g>
    const svgChildren = container.querySelector('svg')?.children;
    expect(svgChildren).toBeDefined();
    // The first child should be the <g> element, not a background rect
    if (svgChildren) {
      expect(svgChildren[0].tagName).toBe('g');
    }
  });
});

// ─── Different values produce different patterns ─────────────────────────────

describe('QRCode -- determinism and variation', () => {
  it('produces different patterns for different values', () => {
    const { container: container1 } = render(<QRCode value="hello" />);
    const { container: container2 } = render(<QRCode value="world" />);

    const rects1 = container1.querySelectorAll('g rect');
    const rects2 = container2.querySelectorAll('g rect');

    // The two patterns should differ (different rect count or positions)
    const coords1 = Array.from(rects1).map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );
    const coords2 = Array.from(rects2).map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );

    expect(coords1.join('|')).not.toBe(coords2.join('|'));
  });

  it('produces the same pattern for the same value', () => {
    const { container: container1 } = render(<QRCode value="deterministic" />);
    const { container: container2 } = render(<QRCode value="deterministic" />);

    const rects1 = container1.querySelectorAll('g rect');
    const rects2 = container2.querySelectorAll('g rect');

    expect(rects1.length).toBe(rects2.length);

    const coords1 = Array.from(rects1).map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );
    const coords2 = Array.from(rects2).map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );

    expect(coords1.join('|')).toBe(coords2.join('|'));
  });
});

// ─── Error Correction ────────────────────────────────────────────────────────

describe('QRCode -- errorCorrection prop', () => {
  it.each<QRCodeErrorCorrection>(['L', 'M', 'Q', 'H'])(
    'accepts errorCorrection="%s" without crashing',
    (ec) => {
      const { container } = render(<QRCode value="test" errorCorrection={ec} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    },
  );

  it('produces different patterns for different error correction levels', () => {
    const { container: containerL } = render(
      <QRCode value="same-value" errorCorrection="L" />,
    );
    const { container: containerH } = render(
      <QRCode value="same-value" errorCorrection="H" />,
    );

    const rectsL = containerL.querySelectorAll('g rect').length;
    const rectsH = containerH.querySelectorAll('g rect').length;

    // Higher EC should produce a denser (more modules) grid
    expect(rectsH).not.toBe(rectsL);
  });
});

// ─── className ───────────────────────────────────────────────────────────────

describe('QRCode -- className', () => {
  it('applies custom className to the SVG element', () => {
    const { container } = render(<QRCode value="test" className="custom-qr" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-qr');
  });
});

// ─── Ref forwarding ──────────────────────────────────────────────────────────

describe('QRCode -- ref forwarding', () => {
  it('forwards ref to the root SVG element', () => {
    const ref = { current: null as SVGSVGElement | null };
    render(<QRCode ref={ref} value="test" />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });
});

// ─── Structural elements ─────────────────────────────────────────────────────

describe('QRCode -- structural elements', () => {
  it('renders dark modules (rect elements inside the g)', () => {
    const { container } = render(<QRCode value="hello world" />);
    const rects = container.querySelectorAll('g rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('has a square viewBox matching the grid dimension', () => {
    const { container } = render(<QRCode value="test" />);
    const svg = container.querySelector('svg');
    const viewBox = svg?.getAttribute('viewBox');
    expect(viewBox).toBeDefined();
    // viewBox should be "0 0 N N" where N is the same for width and height
    const parts = viewBox!.split(' ');
    expect(parts[0]).toBe('0');
    expect(parts[1]).toBe('0');
    expect(parts[2]).toBe(parts[3]);
  });
});
