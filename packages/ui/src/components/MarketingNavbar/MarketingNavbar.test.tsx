import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarketingNavbar } from './MarketingNavbar';
import type { MarketingNavbarItem } from './MarketingNavbar';

const mockUseIsMobile = vi.fn(() => false);

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: (...args: unknown[]) => mockUseIsMobile(...args),
}));

const sampleItems: MarketingNavbarItem[] = [
  { id: 'features', label: 'Features', href: '#features' },
  { id: 'pricing', label: 'Pricing', href: '#pricing' },
  { id: 'docs', label: 'Docs', href: '/docs' },
];

describe('MarketingNavbar', () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  it('renders nav element', () => {
    render(<MarketingNavbar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders brand', () => {
    render(<MarketingNavbar brand={<span>Acme</span>} />);
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('renders items', () => {
    render(<MarketingNavbar items={sampleItems} />);
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
  });

  it('renders CTA', () => {
    render(<MarketingNavbar cta={<button>Get Started</button>} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('highlights active item', () => {
    render(<MarketingNavbar items={sampleItems} activeId="pricing" />);
    const pricingLink = screen.getByText('Pricing');
    expect(pricingLink.className).toContain('text-primary');
  });

  it('applies transparent class when transparent=true', () => {
    render(<MarketingNavbar transparent />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('bg-transparent');
    expect(nav.className).toContain('marketing-navbar-transparent');
  });

  it('applies scrolled class when transparent=false', () => {
    render(<MarketingNavbar />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('marketing-navbar-scrolled');
    expect(nav.className).toContain('bg-surface/95');
    expect(nav.className).toContain('backdrop-blur-md');
  });

  it('renders announcement bar', () => {
    render(<MarketingNavbar announcement={<span>New release!</span>} />);
    expect(screen.getByText('New release!')).toBeInTheDocument();
  });

  it('calls onNavigate when item is clicked', () => {
    const onNavigate = vi.fn();
    render(<MarketingNavbar items={sampleItems} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Docs'));
    expect(onNavigate).toHaveBeenCalledWith('docs');
  });

  it('shows burger on mobile', () => {
    mockUseIsMobile.mockReturnValue(true);
    render(<MarketingNavbar items={sampleItems} />);
    expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<MarketingNavbar className="my-custom-class" />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('my-custom-class');
  });
});
