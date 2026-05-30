import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination, getPageRange } from './Pagination';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Pagination -- renders page buttons', () => {
  it('renders all page buttons for small total', () => {
    render(<Pagination page={1} total={5} onChange={() => {}} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: `Go to page ${i}` })).toBeInTheDocument();
    }
  });

  it('renders within a nav element with aria-label', () => {
    const { container } = render(<Pagination page={1} total={5} onChange={() => {}} />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('renders nothing meaningful for zero total', () => {
    render(<Pagination page={1} total={0} onChange={() => {}} />);
    // Should still render prev/next but no page buttons
    expect(screen.queryByRole('button', { name: 'Go to page 1' })).not.toBeInTheDocument();
  });
});

// ─── Active Page ────────────────────────────────────────────────────────────

describe('Pagination -- active page has aria-current', () => {
  it('sets aria-current="page" on the active page', () => {
    render(<Pagination page={3} total={5} onChange={() => {}} />);
    const activePage = screen.getByRole('button', { name: 'Go to page 3' });
    expect(activePage).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current on inactive pages', () => {
    render(<Pagination page={3} total={5} onChange={() => {}} />);
    const inactivePage = screen.getByRole('button', { name: 'Go to page 1' });
    expect(inactivePage).not.toHaveAttribute('aria-current');
  });

  it('applies active styling class on current page', () => {
    render(<Pagination page={2} total={5} onChange={() => {}} />);
    const activePage = screen.getByRole('button', { name: 'Go to page 2' });
    expect(activePage).toHaveClass('bg-primary');
    expect(activePage).toHaveClass('text-white');
  });
});

// ─── onChange ────────────────────────────────────────────────────────────────

describe('Pagination -- calls onChange on click', () => {
  it('calls onChange with the clicked page number', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination page={1} total={5} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange when clicking next', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination page={2} total={5} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange when clicking previous', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination page={3} total={5} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('does not call onChange when clicking the current page', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination page={3} total={5} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(handleChange).not.toHaveBeenCalled();
  });
});

// ─── Previous Disabled on First Page ────────────────────────────────────────

describe('Pagination -- previous disabled on page 1', () => {
  it('disables previous button on page 1', () => {
    render(<Pagination page={1} total={5} onChange={() => {}} />);
    const prevButton = screen.getByRole('button', { name: 'Go to previous page' });
    expect(prevButton).toBeDisabled();
  });

  it('disables first page button on page 1', () => {
    render(<Pagination page={1} total={5} onChange={() => {}} />);
    const firstButton = screen.getByRole('button', { name: 'Go to first page' });
    expect(firstButton).toBeDisabled();
  });

  it('enables previous button on page 2', () => {
    render(<Pagination page={2} total={5} onChange={() => {}} />);
    const prevButton = screen.getByRole('button', { name: 'Go to previous page' });
    expect(prevButton).not.toBeDisabled();
  });
});

// ─── Next Disabled on Last Page ─────────────────────────────────────────────

describe('Pagination -- next disabled on last page', () => {
  it('disables next button on the last page', () => {
    render(<Pagination page={5} total={5} onChange={() => {}} />);
    const nextButton = screen.getByRole('button', { name: 'Go to next page' });
    expect(nextButton).toBeDisabled();
  });

  it('disables last page button on the last page', () => {
    render(<Pagination page={5} total={5} onChange={() => {}} />);
    const lastButton = screen.getByRole('button', { name: 'Go to last page' });
    expect(lastButton).toBeDisabled();
  });

  it('enables next button when not on last page', () => {
    render(<Pagination page={4} total={5} onChange={() => {}} />);
    const nextButton = screen.getByRole('button', { name: 'Go to next page' });
    expect(nextButton).not.toBeDisabled();
  });
});

// ─── Ellipsis ───────────────────────────────────────────────────────────────

describe('Pagination -- shows ellipsis for many pages', () => {
  it('renders ellipsis when pages are truncated', () => {
    const { container } = render(<Pagination page={10} total={20} onChange={() => {}} />);
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    // Filter to only the "..." text spans (not SVG aria-hidden)
    const dotSpans = Array.from(ellipses).filter(
      (el) => el.tagName === 'SPAN' && el.textContent === '...',
    );
    expect(dotSpans.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render ellipsis for few pages', () => {
    const { container } = render(<Pagination page={1} total={5} onChange={() => {}} />);
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    const dotSpans = Array.from(ellipses).filter(
      (el) => el.tagName === 'SPAN' && el.textContent === '...',
    );
    expect(dotSpans.length).toBe(0);
  });

  it('shows two ellipses when current page is in the middle of a large range', () => {
    const { container } = render(<Pagination page={10} total={20} onChange={() => {}} />);
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    const dotSpans = Array.from(ellipses).filter(
      (el) => el.tagName === 'SPAN' && el.textContent === '...',
    );
    expect(dotSpans.length).toBe(2);
  });
});

// ─── Siblings Prop ──────────────────────────────────────────────────────────

describe('Pagination -- respects siblings prop', () => {
  it('shows more sibling pages with siblings=2', () => {
    render(<Pagination page={10} total={20} siblings={2} onChange={() => {}} />);
    // With siblings=2, pages 8, 9, 10, 11, 12 should all be visible
    for (let i = 8; i <= 12; i++) {
      expect(screen.getByRole('button', { name: `Go to page ${i}` })).toBeInTheDocument();
    }
  });

  it('shows fewer sibling pages with siblings=0', () => {
    render(<Pagination page={10} total={20} siblings={0} onChange={() => {}} />);
    // With siblings=0, only page 10 should be in the middle (plus boundaries)
    expect(screen.getByRole('button', { name: 'Go to page 10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to page 9' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to page 11' })).not.toBeInTheDocument();
  });
});

// ─── showEdges Prop ─────────────────────────────────────────────────────────

describe('Pagination -- showEdges prop', () => {
  it('hides first/last buttons when showEdges is false', () => {
    render(<Pagination page={3} total={10} showEdges={false} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Go to first page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to last page' })).not.toBeInTheDocument();
  });

  it('shows first/last buttons by default', () => {
    render(<Pagination page={3} total={10} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to last page' })).toBeInTheDocument();
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Pagination -- ref forwarding', () => {
  it('forwards ref to the nav element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Pagination ref={ref} page={1} total={5} onChange={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('NAV');
  });
});

// ─── className Merging ──────────────────────────────────────────────────────

describe('Pagination -- className merging', () => {
  it('merges custom className onto the nav element', () => {
    const { container } = render(
      <Pagination page={1} total={5} onChange={() => {}} className="custom-class" />,
    );
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('custom-class');
  });
});

// ─── getPageRange Unit Tests ────────────────────────────────────────────────

describe('getPageRange', () => {
  it('returns all pages when total is small', () => {
    expect(getPageRange(1, 5, 1, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns empty array for zero total', () => {
    expect(getPageRange(1, 0, 1, 1)).toEqual([]);
  });

  it('returns ellipsis on the right when page is near the start', () => {
    const result = getPageRange(1, 20, 1, 1);
    expect(result[0]).toBe(1);
    expect(result).toContain('ellipsis');
    expect(result[result.length - 1]).toBe(20);
  });

  it('returns ellipsis on the left when page is near the end', () => {
    const result = getPageRange(20, 20, 1, 1);
    expect(result[0]).toBe(1);
    expect(result).toContain('ellipsis');
    expect(result[result.length - 1]).toBe(20);
  });

  it('returns two ellipses when page is in the middle', () => {
    const result = getPageRange(10, 20, 1, 1);
    const ellipsisCount = result.filter((item) => item === 'ellipsis').length;
    expect(ellipsisCount).toBe(2);
  });
});
