import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Changelog } from './Changelog';
import type { ChangelogVersion } from './Changelog';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const singleVersion: ChangelogVersion[] = [
  {
    version: '1.0.0',
    date: '2025-01-15',
    changes: [
      { description: 'Initial release', category: 'added' },
      { description: 'Fixed login bug', category: 'fixed' },
    ],
  },
];

const multipleVersions: ChangelogVersion[] = [
  {
    version: '2.0.0',
    date: '2025-03-01',
    changes: [
      { description: 'New dashboard', category: 'added' },
      { description: 'Updated API endpoints', category: 'changed' },
      { description: 'Removed legacy auth', category: 'removed' },
    ],
  },
  {
    version: '1.1.0',
    date: '2025-02-01',
    changes: [
      { description: 'Dark mode support', category: 'added' },
      { description: 'Fixed memory leak', category: 'fixed' },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-01-15',
    changes: [
      { description: 'Initial release', category: 'added' },
    ],
  },
];

const allCategoriesVersion: ChangelogVersion[] = [
  {
    version: '3.0.0',
    date: '2025-06-01',
    changes: [
      { description: 'New feature X', category: 'added' },
      { description: 'Changed behavior Y', category: 'changed' },
      { description: 'Fixed bug Z', category: 'fixed' },
      { description: 'Removed old API', category: 'removed' },
      { description: 'Deprecated method A', category: 'deprecated' },
      { description: 'Security patch B', category: 'security' },
    ],
  },
];

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Changelog -- renders version numbers', () => {
  it('renders the version number', () => {
    render(<Changelog versions={singleVersion} />);
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('renders multiple version numbers', () => {
    render(<Changelog versions={multipleVersions} />);
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
    expect(screen.getByText('1.1.0')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });
});

// ─── Dates ──────────────────────────────────────────────────────────────────

describe('Changelog -- renders dates', () => {
  it('renders the date text', () => {
    render(<Changelog versions={singleVersion} />);
    expect(screen.getByText('2025-01-15')).toBeInTheDocument();
  });

  it('applies tertiary text style to date', () => {
    render(<Changelog versions={singleVersion} />);
    const date = screen.getByTestId('changelog-date');
    expect(date).toHaveClass('text-sm');
    expect(date).toHaveClass('text-text-tertiary');
  });
});

// ─── Change Descriptions ────────────────────────────────────────────────────

describe('Changelog -- renders change descriptions', () => {
  it('renders all change descriptions', () => {
    render(<Changelog versions={singleVersion} />);
    expect(screen.getByText('Initial release')).toBeInTheDocument();
    expect(screen.getByText('Fixed login bug')).toBeInTheDocument();
  });

  it('renders correct number of change items', () => {
    const { container } = render(<Changelog versions={singleVersion} />);
    const items = container.querySelectorAll('[data-testid="changelog-change-item"]');
    expect(items).toHaveLength(2);
  });
});

// ─── Category Badges ────────────────────────────────────────────────────────

describe('Changelog -- category badges rendered with correct text', () => {
  it('renders all category badges', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Changed')).toBeInTheDocument();
    expect(screen.getByText('Fixed')).toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText('Deprecated')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders badge elements with correct test id', () => {
    const { container } = render(<Changelog versions={allCategoriesVersion} />);
    const badges = container.querySelectorAll('[data-testid="changelog-category-badge"]');
    expect(badges).toHaveLength(6);
  });

  it('applies correct styles to Added badge', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    const badge = screen.getByText('Added');
    expect(badge).toHaveClass('bg-success-subtle');
    expect(badge).toHaveClass('text-success-text');
  });

  it('applies correct styles to Changed badge', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    const badge = screen.getByText('Changed');
    expect(badge).toHaveClass('bg-info-subtle');
    expect(badge).toHaveClass('text-info');
  });

  it('applies correct styles to Fixed badge', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    const badge = screen.getByText('Fixed');
    expect(badge).toHaveClass('bg-warning-subtle');
    expect(badge).toHaveClass('text-warning-text');
  });

  it('applies correct styles to Removed badge', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    const badge = screen.getByText('Removed');
    expect(badge).toHaveClass('bg-danger-subtle');
    expect(badge).toHaveClass('text-danger-text');
  });

  it('applies correct styles to Deprecated badge', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    const badge = screen.getByText('Deprecated');
    expect(badge).toHaveClass('bg-surface-lighter');
    expect(badge).toHaveClass('text-text-muted');
  });

  it('applies correct styles to Security badge', () => {
    render(<Changelog versions={allCategoriesVersion} />);
    const badge = screen.getByText('Security');
    expect(badge).toHaveClass('bg-danger-subtle');
    expect(badge).toHaveClass('text-danger');
  });
});

// ─── Timeline Connector ────────────────────────────────────────────────────

describe('Changelog -- timeline connector present', () => {
  it('renders timeline dots for each version', () => {
    const { container } = render(<Changelog versions={multipleVersions} />);
    const dots = container.querySelectorAll('[data-testid="changelog-timeline-dot"]');
    expect(dots).toHaveLength(3);
  });

  it('renders timeline connectors between versions', () => {
    const { container } = render(<Changelog versions={multipleVersions} />);
    const connectors = container.querySelectorAll('[data-testid="changelog-timeline-connector"]');
    // 3 versions => 2 connectors (none on last)
    expect(connectors).toHaveLength(2);
  });

  it('does not render connector on last version', () => {
    const { container } = render(<Changelog versions={singleVersion} />);
    const connectors = container.querySelectorAll('[data-testid="changelog-timeline-connector"]');
    expect(connectors).toHaveLength(0);
  });

  it('connector has correct border styles', () => {
    const { container } = render(<Changelog versions={multipleVersions} />);
    const connector = container.querySelector('[data-testid="changelog-timeline-connector"]');
    expect(connector).toHaveClass('border-l-2');
    expect(connector).toHaveClass('border-surface-border');
  });
});

// ─── Version Href / Links ───────────────────────────────────────────────────

describe('Changelog -- version href creates link', () => {
  it('renders version as a link when href is provided', () => {
    const versionsWithLink: ChangelogVersion[] = [
      {
        version: '1.0.0',
        date: '2025-01-15',
        href: 'https://github.com/example/releases/tag/v1.0.0',
        changes: [{ description: 'Initial release', category: 'added' }],
      },
    ];
    render(<Changelog versions={versionsWithLink} />);
    const link = screen.getByTestId('changelog-version-link');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://github.com/example/releases/tag/v1.0.0');
    expect(link).toHaveTextContent('1.0.0');
  });

  it('renders version as plain text when href is not provided', () => {
    render(<Changelog versions={singleVersion} />);
    const versionNumber = screen.getByTestId('changelog-version-number');
    expect(versionNumber.tagName).toBe('SPAN');
    expect(versionNumber).toHaveTextContent('1.0.0');
  });
});

// ─── Multiple Versions ──────────────────────────────────────────────────────

describe('Changelog -- multiple versions rendered', () => {
  it('renders all version entries', () => {
    const { container } = render(<Changelog versions={multipleVersions} />);
    const entries = container.querySelectorAll('[data-testid="changelog-version-entry"]');
    expect(entries).toHaveLength(3);
  });

  it('renders versions in provided order', () => {
    const { container } = render(<Changelog versions={multipleVersions} />);
    const entries = container.querySelectorAll('[data-testid="changelog-version-entry"]');
    expect(entries[0]).toHaveTextContent('2.0.0');
    expect(entries[1]).toHaveTextContent('1.1.0');
    expect(entries[2]).toHaveTextContent('1.0.0');
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('Changelog -- custom className', () => {
  it('merges custom className on container', () => {
    const { container } = render(
      <Changelog versions={singleVersion} className="my-custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });

  it('preserves default classes when custom className is added', () => {
    const { container } = render(
      <Changelog versions={singleVersion} className="my-class" />,
    );
    expect(container.firstElementChild).toHaveClass('flex');
    expect(container.firstElementChild).toHaveClass('flex-col');
    expect(container.firstElementChild).toHaveClass('my-class');
  });
});

// ─── renderLink ─────────────────────────────────────────────────────────────

describe('Changelog -- renderLink used', () => {
  it('uses renderLink when provided for version links', () => {
    const versionsWithLink: ChangelogVersion[] = [
      {
        version: '1.0.0',
        date: '2025-01-15',
        href: 'https://github.com/example/releases/tag/v1.0.0',
        changes: [{ description: 'Initial release', category: 'added' }],
      },
    ];
    render(
      <Changelog
        versions={versionsWithLink}
        renderLink={({ href, children, className }) => (
          <button data-testid="custom-link" data-href={href} className={className}>
            {children}
          </button>
        )}
      />,
    );
    const customLink = screen.getByTestId('custom-link');
    expect(customLink).toBeInTheDocument();
    expect(customLink.tagName).toBe('BUTTON');
    expect(customLink).toHaveAttribute('data-href', 'https://github.com/example/releases/tag/v1.0.0');
    expect(customLink).toHaveTextContent('1.0.0');
  });

  it('does not use renderLink when version has no href', () => {
    render(
      <Changelog
        versions={singleVersion}
        renderLink={({ href, children }) => (
          <button data-testid="custom-link" data-href={href}>
            {children}
          </button>
        )}
      />,
    );
    expect(screen.queryByTestId('custom-link')).not.toBeInTheDocument();
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Changelog -- ref forwarding', () => {
  it('forwards ref on container', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Changelog ref={ref} versions={singleVersion} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('Changelog -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(
      <Changelog data-testid="my-changelog" id="changelog-1" versions={singleVersion} />,
    );
    const el = screen.getByTestId('my-changelog');
    expect(el).toHaveAttribute('id', 'changelog-1');
  });
});
