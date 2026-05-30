import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocHeader } from './DocHeader';

// ─── Title Rendering ────────────────────────────────────────────────────────

describe('DocHeader -- title', () => {
  it('renders the title text', () => {
    render(<DocHeader title="Getting Started" />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('renders the title as an h1 element', () => {
    render(<DocHeader title="Installation" />);
    const heading = screen.getByText('Installation');
    expect(heading.tagName).toBe('H1');
  });
});

// ─── Description ────────────────────────────────────────────────────────────

describe('DocHeader -- description', () => {
  it('renders description text when provided', () => {
    render(
      <DocHeader title="API Reference" description="Complete API documentation" />,
    );
    expect(screen.getByText('Complete API documentation')).toBeInTheDocument();
  });

  it('does not render description element when not provided', () => {
    const { container } = render(<DocHeader title="API Reference" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

// ─── Breadcrumbs ────────────────────────────────────────────────────────────

describe('DocHeader -- breadcrumbs', () => {
  it('renders breadcrumbs when provided', () => {
    render(
      <DocHeader
        title="Configuration"
        breadcrumbs={<nav data-testid="breadcrumbs">Docs / Guide / Config</nav>}
      />,
    );
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByText('Docs / Guide / Config')).toBeInTheDocument();
  });
});

// ─── Edit Link ──────────────────────────────────────────────────────────────

describe('DocHeader -- edit link', () => {
  it('renders edit link with href when editUrl is provided', () => {
    render(
      <DocHeader
        title="Setup"
        editUrl="https://github.com/org/repo/edit/main/docs/setup.md"
      />,
    );
    const link = screen.getByText('Edit this page');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/org/repo/edit/main/docs/setup.md',
    );
  });

  it('renders custom edit label', () => {
    render(
      <DocHeader
        title="Setup"
        editUrl="https://example.com/edit"
        editLabel="Suggest edits"
      />,
    );
    expect(screen.getByText('Suggest edits')).toBeInTheDocument();
  });

  it('does not render edit link when editUrl is not provided', () => {
    render(<DocHeader title="Setup" />);
    expect(screen.queryByText('Edit this page')).not.toBeInTheDocument();
  });
});

// ─── Last Updated ───────────────────────────────────────────────────────────

describe('DocHeader -- lastUpdated', () => {
  it('renders last updated date when provided', () => {
    render(<DocHeader title="Changelog" lastUpdated="January 15, 2026" />);
    expect(screen.getByText('Last updated: January 15, 2026')).toBeInTheDocument();
  });
});

// ─── Reading Time ───────────────────────────────────────────────────────────

describe('DocHeader -- readingTime', () => {
  it('renders reading time when provided', () => {
    render(<DocHeader title="Guide" readingTime="5 min read" />);
    expect(screen.getByText('5 min read')).toBeInTheDocument();
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('DocHeader -- className', () => {
  it('merges custom className', () => {
    const { container } = render(
      <DocHeader title="Test" className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
    expect(container.firstElementChild).toHaveClass('border-b');
  });
});

// ─── renderLink ─────────────────────────────────────────────────────────────

describe('DocHeader -- renderLink', () => {
  it('uses renderLink when provided for edit link', () => {
    render(
      <DocHeader
        title="Custom Link"
        editUrl="/docs/edit"
        renderLink={({ href, children, className }) => (
          <button data-testid="custom-link" className={className} data-href={href}>
            {children}
          </button>
        )}
      />,
    );
    const customLink = screen.getByTestId('custom-link');
    expect(customLink).toBeInTheDocument();
    expect(customLink).toHaveAttribute('data-href', '/docs/edit');
    expect(customLink).toHaveTextContent('Edit this page');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('DocHeader -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<DocHeader ref={ref} title="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('HEADER');
  });
});
