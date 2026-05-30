import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FooterLinkGroup = {
  title: string;
  links: { label: string; href: string }[];
};

export type FooterProps = React.HTMLAttributes<HTMLElement> & {
  /** Logo or brand mark rendered in the top-left area. */
  logo?: React.ReactNode;
  /** Short tagline displayed beneath the logo. */
  tagline?: string;
  /** Column groups of navigation links. */
  linkGroups?: FooterLinkGroup[];
  /** Social media icon links rendered beside or below the logo area. */
  socialLinks?: React.ReactNode;
  /** Copyright text or node rendered in the bottom row. */
  copyright?: React.ReactNode;
  /** Newsletter signup slot rendered beside the logo/tagline area. */
  newsletter?: React.ReactNode;
  /** Custom link renderer for framework integration (e.g. React Router). */
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

// ─── Link classes ───────────────────────────────────────────────────────────

const linkClassName =
  'text-sm text-dark-text-muted hover:text-dark-text transition-colors';

// ─── Default link renderer ─────────────────────────────────────────────────

const defaultRenderLink = ({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <a href={href} className={className}>
    {children}
  </a>
);

// ─── Footer ─────────────────────────────────────────────────────────────────

export const Footer = forwardRef<HTMLElement, FooterProps>(function Footer(
  {
    logo,
    tagline,
    linkGroups,
    socialLinks,
    copyright,
    newsletter,
    renderLink = defaultRenderLink,
    className,
    ...rest
  },
  ref,
) {
  const rootClassName = [
    'bg-dark-surface text-dark-text w-full',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasLinkGroups = linkGroups != null && linkGroups.length > 0;

  return (
    <footer
      ref={ref}
      className={rootClassName}
      data-testid="footer"
      {...rest}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* ── Top section: brand + link groups ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="md:col-span-4 flex flex-col gap-4">
            {logo && <div data-testid="footer-logo">{logo}</div>}
            {tagline && (
              <p
                className="text-sm text-dark-text-muted max-w-xs"
                data-testid="footer-tagline"
              >
                {tagline}
              </p>
            )}
            {socialLinks && (
              <div
                className="flex items-center gap-3 mt-2"
                data-testid="footer-social"
              >
                {socialLinks}
              </div>
            )}
          </div>

          {/* Link group columns */}
          {hasLinkGroups && (
            <div
              className="md:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-8"
              data-testid="footer-link-groups"
            >
              {linkGroups.map((group) => (
                <div key={group.title}>
                  <h3
                    className="text-sm font-semibold text-dark-text mb-3"
                    data-testid="footer-group-title"
                  >
                    {group.title}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        {renderLink({
                          href: link.href,
                          children: link.label,
                          className: linkClassName,
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Newsletter slot */}
          {newsletter && (
            <div
              className="md:col-span-3"
              data-testid="footer-newsletter"
            >
              {newsletter}
            </div>
          )}
        </div>

        {/* ── Separator ────────────────────────────────────────────────── */}
        <div className="border-t border-dark-border mt-10 pt-6" />

        {/* ── Bottom copyright row ─────────────────────────────────────── */}
        {copyright && (
          <div
            className="text-sm text-dark-text-muted"
            data-testid="footer-copyright"
          >
            {copyright}
          </div>
        )}
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
