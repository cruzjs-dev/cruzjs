import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HelpCenter } from './HelpCenter';
import type { HelpCategory, HelpArticle } from './HelpCenter';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const sampleCategories: HelpCategory[] = [
  { id: 'getting-started', title: 'Getting Started', description: 'Learn the basics', articleCount: 12, href: '/help/getting-started' },
  { id: 'billing', title: 'Billing', description: 'Payments and invoices', articleCount: 8, href: '/help/billing' },
  { id: 'api', title: 'API Reference', articleCount: 1 },
];

const sampleArticles: HelpArticle[] = [
  { id: 'a1', title: 'How to create an account', category: 'Getting Started', href: '/help/articles/create-account' },
  { id: 'a2', title: 'Managing your subscription', category: 'Billing', href: '/help/articles/manage-subscription' },
  { id: 'a3', title: 'Using the REST API', category: 'API' },
];

// ─── Heading & description ────────────────────────────────────────────────

describe('HelpCenter -- heading & description', () => {
  it('renders heading', () => {
    render(<HelpCenter heading="Help Center" />);
    expect(screen.getByText('Help Center')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<HelpCenter heading="Help" description="How can we help you?" />);
    expect(screen.getByText('How can we help you?')).toBeInTheDocument();
  });
});

// ─── Search ───────────────────────────────────────────────────────────────

describe('HelpCenter -- search', () => {
  it('renders search input', () => {
    render(<HelpCenter />);
    expect(screen.getByLabelText('Search help articles')).toBeInTheDocument();
  });

  it('onSearch fires on input', () => {
    const onSearch = vi.fn();
    render(<HelpCenter onSearch={onSearch} />);
    const input = screen.getByLabelText('Search help articles');

    fireEvent.change(input, { target: { value: 'billing' } });
    expect(onSearch).toHaveBeenCalledWith('billing');
  });

  it('uses custom searchPlaceholder', () => {
    render(<HelpCenter searchPlaceholder="Find answers..." />);
    expect(screen.getByPlaceholderText('Find answers...')).toBeInTheDocument();
  });
});

// ─── Category cards ───────────────────────────────────────────────────────

describe('HelpCenter -- categories', () => {
  it('renders category cards with titles', () => {
    render(<HelpCenter categories={sampleCategories} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
  });

  it('renders article count', () => {
    render(<HelpCenter categories={sampleCategories} />);
    expect(screen.getByText('12 articles')).toBeInTheDocument();
    expect(screen.getByText('8 articles')).toBeInTheDocument();
    expect(screen.getByText('1 article')).toBeInTheDocument();
  });

  it('category href creates link', () => {
    render(<HelpCenter categories={sampleCategories} />);
    const link = screen.getByRole('link', { name: /Getting Started/i });
    expect(link).toHaveAttribute('href', '/help/getting-started');
  });
});

// ─── Popular articles ─────────────────────────────────────────────────────

describe('HelpCenter -- popular articles', () => {
  it('renders popular articles', () => {
    render(<HelpCenter popularArticles={sampleArticles} />);
    expect(screen.getByText('How to create an account')).toBeInTheDocument();
    expect(screen.getByText('Managing your subscription')).toBeInTheDocument();
    expect(screen.getByText('Using the REST API')).toBeInTheDocument();
  });

  it('article href creates link', () => {
    render(<HelpCenter popularArticles={sampleArticles} />);
    const link = screen.getByRole('link', { name: /How to create an account/i });
    expect(link).toHaveAttribute('href', '/help/articles/create-account');
  });
});

// ─── Custom className ─────────────────────────────────────────────────────

describe('HelpCenter -- custom className', () => {
  it('merges custom className', () => {
    render(<HelpCenter className="my-custom-class" />);
    const section = screen.getByTestId('help-center');
    expect(section.className).toContain('my-custom-class');
  });
});

// ─── renderLink ───────────────────────────────────────────────────────────

describe('HelpCenter -- renderLink', () => {
  it('uses custom renderLink for category links', () => {
    const renderLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    );

    render(
      <HelpCenter
        categories={[{ id: 'cat1', title: 'Test Category', href: '/test' }]}
        renderLink={renderLink}
      />,
    );

    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
  });

  it('uses custom renderLink for article links', () => {
    const renderLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
      <a href={href} className={className} data-testid="custom-article-link">
        {children}
      </a>
    );

    render(
      <HelpCenter
        popularArticles={[{ id: 'a1', title: 'Test Article', href: '/test-article' }]}
        renderLink={renderLink}
      />,
    );

    expect(screen.getByTestId('custom-article-link')).toBeInTheDocument();
  });
});

// ─── Ref forwarding ───────────────────────────────────────────────────────

describe('HelpCenter -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<HelpCenter ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
