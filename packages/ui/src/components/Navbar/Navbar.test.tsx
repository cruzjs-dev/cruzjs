import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import type { NavbarItem } from './Navbar';

// Default: desktop mode (useIsMobile returns false)
const mockUseIsMobile = vi.fn(() => false);

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: (...args: unknown[]) => mockUseIsMobile(...args),
}));

const sampleItems: NavbarItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'docs', label: 'Docs', href: '/docs' },
];

describe('Navbar', () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  it('renders nav element', () => {
    render(<Navbar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders brand', () => {
    render(<Navbar brand={<span>MyBrand</span>} />);
    expect(screen.getByText('MyBrand')).toBeInTheDocument();
  });

  it('renders nav items', () => {
    render(<Navbar items={sampleItems} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
  });

  it('highlights active item', () => {
    render(<Navbar items={sampleItems} activeId="about" />);
    const aboutLink = screen.getByText('About');
    expect(aboutLink.className).toContain('text-primary');
    expect(aboutLink.className).toContain('bg-primary-subtle');
  });

  it('calls onNavigate on item click', () => {
    const onNavigate = vi.fn();
    render(<Navbar items={sampleItems} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Docs'));
    expect(onNavigate).toHaveBeenCalledWith('docs');
  });

  it('renders search slot', () => {
    render(<Navbar search={<input placeholder="Search..." />} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<Navbar actions={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders sticky class when sticky', () => {
    render(<Navbar sticky />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('sticky');
    expect(nav.className).toContain('top-0');
    expect(nav.className).toContain('z-30');
  });

  it('renders border when bordered', () => {
    render(<Navbar bordered />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('border-b');
    expect(nav.className).toContain('border-surface-border');
  });

  it('renders burger on mobile', () => {
    mockUseIsMobile.mockReturnValue(true);
    render(<Navbar items={sampleItems} />);
    expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
  });
});
