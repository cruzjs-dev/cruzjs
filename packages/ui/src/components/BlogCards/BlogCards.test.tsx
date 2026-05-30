import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlogCards } from './BlogCards';
import type { BlogArticle } from './BlogCards';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const baseArticles: BlogArticle[] = [
  {
    id: 'article-1',
    title: 'Getting Started with CruzJS',
    excerpt: 'Learn how to build full-stack apps with CruzJS and Cloudflare.',
    coverImage: '/images/article-1.jpg',
    author: { name: 'Jane Doe', avatarSrc: '/avatars/jane.jpg' },
    date: 'Jan 15, 2026',
    tags: ['Tutorial', 'Beginner'],
    href: '/blog/getting-started',
  },
  {
    id: 'article-2',
    title: 'Advanced tRPC Patterns',
    excerpt: 'Deep dive into tRPC router composition and middleware.',
    coverImage: '/images/article-2.jpg',
    author: { name: 'John Smith' },
    date: 'Feb 20, 2026',
    tags: ['Advanced', 'tRPC'],
    href: '/blog/advanced-trpc',
  },
  {
    id: 'article-3',
    title: 'Deploying to Cloudflare',
    excerpt: 'Step-by-step guide to deploying your CruzJS app.',
    author: { name: 'Alice Chen', avatarSrc: '/avatars/alice.jpg' },
    date: 'Mar 5, 2026',
    href: '/blog/deploying-cloudflare',
  },
];

// ─── Article titles ─────────────────────────────────────────────────────────

describe('BlogCards -- article titles', () => {
  it('renders all article titles', () => {
    render(<BlogCards articles={baseArticles} />);
    expect(screen.getByText('Getting Started with CruzJS')).toBeInTheDocument();
    expect(screen.getByText('Advanced tRPC Patterns')).toBeInTheDocument();
    expect(screen.getByText('Deploying to Cloudflare')).toBeInTheDocument();
  });
});

// ─── Excerpts ───────────────────────────────────────────────────────────────

describe('BlogCards -- excerpts', () => {
  it('renders article excerpts', () => {
    render(<BlogCards articles={baseArticles} />);
    expect(
      screen.getByText('Learn how to build full-stack apps with CruzJS and Cloudflare.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Deep dive into tRPC router composition and middleware.'),
    ).toBeInTheDocument();
  });

  it('renders cards without excerpt when not provided', () => {
    const articles: BlogArticle[] = [
      { id: 'no-excerpt', title: 'No Excerpt Article' },
    ];
    render(<BlogCards articles={articles} />);
    expect(screen.getByText('No Excerpt Article')).toBeInTheDocument();
  });
});

// ─── Cover images ───────────────────────────────────────────────────────────

describe('BlogCards -- cover images', () => {
  it('renders cover images with correct src and alt', () => {
    render(<BlogCards articles={baseArticles} />);
    const images = screen.getAllByTestId('cover-image');
    expect(images.length).toBe(2);
    expect(images[0]).toHaveAttribute('src', '/images/article-1.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Getting Started with CruzJS');
  });

  it('does not render image when coverImage is not provided', () => {
    const articles: BlogArticle[] = [
      { id: 'no-image', title: 'No Image Article' },
    ];
    render(<BlogCards articles={articles} />);
    expect(screen.queryByTestId('cover-image')).not.toBeInTheDocument();
  });
});

// ─── Author name ────────────────────────────────────────────────────────────

describe('BlogCards -- author name', () => {
  it('renders author names', () => {
    render(<BlogCards articles={baseArticles} />);
    const authorNames = screen.getAllByTestId('author-name');
    expect(authorNames.length).toBe(3);
    expect(authorNames[0]).toHaveTextContent('Jane Doe');
    expect(authorNames[1]).toHaveTextContent('John Smith');
    expect(authorNames[2]).toHaveTextContent('Alice Chen');
  });

  it('renders avatar image when avatarSrc is provided', () => {
    render(<BlogCards articles={baseArticles} />);
    const avatars = screen.getAllByTestId('author-avatar');
    expect(avatars.length).toBe(2);
    expect(avatars[0]).toHaveAttribute('src', '/avatars/jane.jpg');
  });

  it('renders avatar fallback when avatarSrc is not provided', () => {
    render(<BlogCards articles={baseArticles} />);
    const fallbacks = screen.getAllByTestId('author-avatar-fallback');
    expect(fallbacks.length).toBe(1);
    expect(fallbacks[0]).toHaveTextContent('J');
  });
});

// ─── Date ───────────────────────────────────────────────────────────────────

describe('BlogCards -- date', () => {
  it('renders article dates', () => {
    render(<BlogCards articles={baseArticles} />);
    const dates = screen.getAllByTestId('article-date');
    expect(dates.length).toBe(3);
    expect(dates[0]).toHaveTextContent('Jan 15, 2026');
    expect(dates[1]).toHaveTextContent('Feb 20, 2026');
  });
});

// ─── Tags ───────────────────────────────────────────────────────────────────

describe('BlogCards -- tags', () => {
  it('renders tags as badges', () => {
    render(<BlogCards articles={baseArticles} />);
    const badges = screen.getAllByTestId('tag-badge');
    // article-1 has 2 tags, article-2 has 2 tags = 4 total
    expect(badges.length).toBe(4);
    expect(badges[0]).toHaveTextContent('Tutorial');
    expect(badges[1]).toHaveTextContent('Beginner');
    expect(badges[2]).toHaveTextContent('Advanced');
    expect(badges[3]).toHaveTextContent('tRPC');
  });

  it('does not render tag section when tags are empty', () => {
    const articles: BlogArticle[] = [
      { id: 'no-tags', title: 'No Tags', tags: [] },
    ];
    render(<BlogCards articles={articles} />);
    expect(screen.queryByTestId('tag-badge')).not.toBeInTheDocument();
  });
});

// ─── Heading ────────────────────────────────────────────────────────────────

describe('BlogCards -- heading', () => {
  it('renders string heading as h2', () => {
    render(<BlogCards articles={baseArticles} heading="Latest Articles" />);
    const heading = screen.getByText('Latest Articles');
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });

  it('renders custom heading node', () => {
    render(
      <BlogCards
        articles={baseArticles}
        heading={<h3 data-testid="custom-heading">Custom Heading</h3>}
      />,
    );
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
  });

  it('does not render heading section when not provided', () => {
    const { container } = render(<BlogCards articles={baseArticles} />);
    expect(container.querySelector('h2')).not.toBeInTheDocument();
  });
});

// ─── Grid columns ───────────────────────────────────────────────────────────

describe('BlogCards -- grid columns', () => {
  it('applies 3-column grid by default', () => {
    const { container } = render(<BlogCards articles={baseArticles} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('lg:grid-cols-3');
  });

  it('applies 2-column grid when columns=2', () => {
    const { container } = render(<BlogCards articles={baseArticles} columns={2} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('sm:grid-cols-2');
    expect(grid?.className).not.toContain('lg:grid-cols-3');
  });

  it('applies 4-column grid when columns=4', () => {
    const { container } = render(<BlogCards articles={baseArticles} columns={4} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('lg:grid-cols-4');
  });
});

// ─── Href makes card clickable ──────────────────────────────────────────────

describe('BlogCards -- href', () => {
  it('renders card as anchor when href is provided', () => {
    render(<BlogCards articles={baseArticles} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(3);
    expect(links[0]).toHaveAttribute('href', '/blog/getting-started');
  });

  it('renders card as div when href is not provided', () => {
    const articles: BlogArticle[] = [
      { id: 'no-link', title: 'No Link Article' },
    ];
    render(<BlogCards articles={articles} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('BlogCards -- custom className', () => {
  it('applies custom className to root element', () => {
    const { container } = render(
      <BlogCards articles={baseArticles} className="my-custom-class" />,
    );
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });
});

// ─── renderLink ─────────────────────────────────────────────────────────────

describe('BlogCards -- renderLink', () => {
  it('uses renderLink for articles with href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    render(<BlogCards articles={baseArticles} renderLink={renderLink} />);

    const customLinks = screen.getAllByTestId('custom-link');
    expect(customLinks.length).toBe(3);
    expect(renderLink).toHaveBeenCalledTimes(3);
    expect(customLinks[0]).toHaveAttribute('href', '/blog/getting-started');
  });

  it('does not call renderLink for articles without href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    const articles: BlogArticle[] = [
      { id: 'no-href', title: 'No Href' },
      { id: 'has-href', title: 'Has Href', href: '/blog/test' },
    ];

    render(<BlogCards articles={articles} renderLink={renderLink} />);

    expect(renderLink).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('custom-link').length).toBe(1);
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('BlogCards -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<BlogCards ref={ref} articles={baseArticles} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
