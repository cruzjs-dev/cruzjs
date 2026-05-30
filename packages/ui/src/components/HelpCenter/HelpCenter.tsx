import React, { forwardRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type HelpCategory = {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  articleCount?: number;
  href?: string;
};

export type HelpArticle = {
  id: string;
  title: string;
  category?: string;
  href?: string;
};

export type HelpCenterProps = React.HTMLAttributes<HTMLElement> & {
  heading?: React.ReactNode;
  description?: React.ReactNode;
  categories?: HelpCategory[];
  popularArticles?: HelpArticle[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  renderLink?: (props: { href: string; children: React.ReactNode; className?: string }) => React.ReactNode;
};

// ─── Search icon (inline SVG) ───────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      className="w-5 h-5 text-text-secondary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

// ─── Arrow icon (inline SVG) ────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Default link renderer ──────────────────────────────────────────────────

function DefaultLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

// ─── CategoryCard (internal) ────────────────────────────────────────────────

function CategoryCard({
  category,
  renderLink,
}: {
  category: HelpCategory;
  renderLink: NonNullable<HelpCenterProps['renderLink']>;
}) {
  const content = (
    <>
      {category.icon && (
        <div className="w-10 h-10 rounded-lg bg-primary-subtle text-primary flex items-center justify-center mb-3">
          {category.icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-text">{category.title}</h3>
      {category.description && (
        <p className="mt-1 text-xs text-text-secondary line-clamp-2">{category.description}</p>
      )}
      {category.articleCount != null && (
        <span className="mt-2 inline-block text-xs text-text-secondary" data-testid={`category-count-${category.id}`}>
          {category.articleCount} {category.articleCount === 1 ? 'article' : 'articles'}
        </span>
      )}
    </>
  );

  const cardClassName = [
    'block rounded-xl border border-surface-border bg-surface p-5',
    'transition-all duration-200',
    'hover:shadow-md hover:-translate-y-0.5',
    category.href ? 'cursor-pointer' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (category.href) {
    return (
      <>
        {renderLink({
          href: category.href,
          className: cardClassName,
          children: content,
        })}
      </>
    );
  }

  return (
    <div className={cardClassName} data-testid={`category-card-${category.id}`}>
      {content}
    </div>
  );
}

// ─── ArticleRow (internal) ──────────────────────────────────────────────────

function ArticleRow({
  article,
  renderLink,
}: {
  article: HelpArticle;
  renderLink: NonNullable<HelpCenterProps['renderLink']>;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-primary hover:underline">{article.title}</span>
        {article.category && (
          <span className="ml-2 text-xs text-text-secondary">{article.category}</span>
        )}
      </div>
      <ArrowRightIcon />
    </div>
  );

  if (article.href) {
    return (
      <li className="border-b border-surface-border last:border-b-0" data-testid={`article-${article.id}`}>
        {renderLink({
          href: article.href,
          className: 'block py-3 px-1 transition-colors duration-150 hover:bg-surface-lighter/50 rounded',
          children: content,
        })}
      </li>
    );
  }

  return (
    <li
      className="py-3 px-1 border-b border-surface-border last:border-b-0"
      data-testid={`article-${article.id}`}
    >
      {content}
    </li>
  );
}

// ─── HelpCenter ─────────────────────────────────────────────────────────────

export const HelpCenter = forwardRef<HTMLElement, HelpCenterProps>(function HelpCenter(
  {
    heading,
    description,
    categories,
    popularArticles,
    searchPlaceholder = 'Search help articles...',
    onSearch,
    renderLink,
    className,
    ...rest
  },
  ref,
) {
  const [searchValue, setSearchValue] = useState('');

  const linkRenderer = renderLink ?? (({ href, children, className: cn }) => (
    <DefaultLink href={href} className={cn}>{children}</DefaultLink>
  ));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  };

  const sectionClassName = ['w-full', className ?? ''].filter(Boolean).join(' ');

  return (
    <section ref={ref} className={sectionClassName} data-testid="help-center" {...rest}>
      {/* Heading + Description */}
      {(heading || description) && (
        <div className="mb-8 text-center">
          {heading && (
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
              {heading}
            </h2>
          )}
          {description && (
            <p className="mt-2 text-base text-text-secondary max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-10 max-w-xl mx-auto" data-testid="help-center-search">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className={[
              'w-full pl-12 pr-4 py-3 text-base rounded-xl',
              'bg-surface border border-surface-border text-text',
              'placeholder:text-text-secondary',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              'transition-colors duration-150',
              'shadow-sm',
            ].join(' ')}
            aria-label="Search help articles"
          />
        </div>
      </div>

      {/* Category cards grid */}
      {categories && categories.length > 0 && (
        <div
          className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="help-center-categories"
        >
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} renderLink={linkRenderer} />
          ))}
        </div>
      )}

      {/* Popular articles */}
      {popularArticles && popularArticles.length > 0 && (
        <div className="max-w-2xl mx-auto" data-testid="help-center-articles">
          <h3 className="text-lg font-semibold text-text mb-4">Popular Articles</h3>
          <ul className="rounded-xl border border-surface-border bg-surface divide-y divide-surface-border">
            {popularArticles.map((article) => (
              <ArticleRow key={article.id} article={article} renderLink={linkRenderer} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
});

HelpCenter.displayName = 'HelpCenter';
