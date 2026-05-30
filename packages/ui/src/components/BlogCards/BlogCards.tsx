import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BlogArticle = {
  id: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  author?: { name: string; avatarSrc?: string };
  date?: string;
  tags?: string[];
  href?: string;
};

export type BlogCardsProps = React.HTMLAttributes<HTMLElement> & {
  articles: BlogArticle[];
  heading?: React.ReactNode;
  columns?: 2 | 3 | 4;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// ─── Author Line ────────────────────────────────────────────────────────────

const AuthorLine: React.FC<{ author?: BlogArticle['author']; date?: string }> = ({
  author,
  date,
}) => {
  if (!author && !date) return null;

  return (
    <div className="flex items-center gap-2 mt-4">
      {author?.avatarSrc && (
        <img
          src={author.avatarSrc}
          alt={author.name}
          className="w-6 h-6 rounded-full object-cover"
          data-testid="author-avatar"
        />
      )}
      {author && !author.avatarSrc && (
        <div
          className="w-6 h-6 rounded-full bg-primary-subtle flex items-center justify-center text-xs font-medium text-primary"
          data-testid="author-avatar-fallback"
        >
          {author.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
        {author && <span data-testid="author-name">{author.name}</span>}
        {author && date && <span aria-hidden="true">&middot;</span>}
        {date && <time data-testid="article-date">{date}</time>}
      </div>
    </div>
  );
};

// ─── Tag Badges ─────────────────────────────────────────────────────────────

const TagBadges: React.FC<{ tags: string[] }> = ({ tags }) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-primary-subtle text-primary text-xs font-medium rounded-full px-2.5 py-0.5"
          data-testid="tag-badge"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

// ─── Article Card ───────────────────────────────────────────────────────────

const ArticleCard: React.FC<{
  article: BlogArticle;
  renderLink?: BlogCardsProps['renderLink'];
}> = ({ article, renderLink }) => {
  const cardContent = (
    <>
      {/* Cover image */}
      {article.coverImage && (
        <img
          src={article.coverImage}
          alt={article.title}
          className="aspect-[16/9] object-cover rounded-t-xl w-full"
          data-testid="cover-image"
        />
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-text leading-snug line-clamp-2">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="text-sm text-text-secondary mt-2 line-clamp-3">{article.excerpt}</p>
        )}

        {article.tags && article.tags.length > 0 && <TagBadges tags={article.tags} />}

        <AuthorLine author={article.author} date={article.date} />
      </div>
    </>
  );

  const cardClassName =
    'bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1),0_4px_12px_-2px_rgba(0,0,0,0.06)]';

  if (article.href && renderLink) {
    return renderLink({
      href: article.href,
      className: `${cardClassName} block`,
      children: cardContent,
    });
  }

  if (article.href) {
    return (
      <a
        href={article.href}
        className={`${cardClassName} block`}
        data-testid={`article-${article.id}`}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div className={cardClassName} data-testid={`article-${article.id}`}>
      {cardContent}
    </div>
  );
};

// ─── BlogCards ──────────────────────────────────────────────────────────────

export const BlogCards = forwardRef<HTMLElement, BlogCardsProps>(function BlogCards(
  { articles, heading, columns = 3, renderLink, className, ...rest },
  ref,
) {
  return (
    <section ref={ref} className={className} {...rest}>
      {heading && (
        <div className="mb-8">
          {typeof heading === 'string' ? (
            <h2 className="text-2xl font-bold text-text">{heading}</h2>
          ) : (
            heading
          )}
        </div>
      )}

      <div className={['grid gap-6', columnClasses[columns]].join(' ')}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} renderLink={renderLink} />
        ))}
      </div>
    </section>
  );
});

BlogCards.displayName = 'BlogCards';
