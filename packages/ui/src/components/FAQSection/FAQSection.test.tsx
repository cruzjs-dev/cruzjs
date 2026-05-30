import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FAQSection } from './FAQSection';
import type { FAQItem } from './FAQSection';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const sampleItems: FAQItem[] = [
  { id: '1', question: 'What is CruzJS?', answer: 'A full-stack SaaS framework.', category: 'General' },
  { id: '2', question: 'How do I deploy?', answer: 'Run cruz deploy.', category: 'Technical' },
  { id: '3', question: 'Is it free?', answer: 'Yes, free to start.', category: 'General' },
  { id: '4', question: 'What databases are supported?', answer: 'D1 and SQLite.', category: 'Technical' },
];

// ─── Rendering questions ───────────────────────────────────────────────────

describe('FAQSection -- rendering', () => {
  it('renders all questions', () => {
    render(<FAQSection items={sampleItems} />);
    for (const item of sampleItems) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it('does not show answers by default', () => {
    render(<FAQSection items={sampleItems} />);
    for (const item of sampleItems) {
      const region = screen.getByRole('region', { name: item.question });
      expect(region.style.height).toBe('0px');
    }
  });
});

// ─── Expand / collapse ─────────────────────────────────────────────────────

describe('FAQSection -- expand/collapse', () => {
  it('clicking a question reveals its answer', () => {
    render(<FAQSection items={sampleItems} />);
    const button = screen.getByText('What is CruzJS?');
    fireEvent.click(button);

    const region = screen.getByRole('region', { name: 'What is CruzJS?' });
    expect(region.style.opacity).toBe('1');
  });

  it('single mode: opening one closes the other', () => {
    render(<FAQSection items={sampleItems} />);

    // Open first
    fireEvent.click(screen.getByText('What is CruzJS?'));
    const region1 = screen.getByRole('region', { name: 'What is CruzJS?' });
    expect(region1.style.opacity).toBe('1');

    // Open second — first should close
    fireEvent.click(screen.getByText('How do I deploy?'));
    expect(region1.style.opacity).toBe('0');

    const region2 = screen.getByRole('region', { name: 'How do I deploy?' });
    expect(region2.style.opacity).toBe('1');
  });

  it('clicking an open question collapses it', () => {
    render(<FAQSection items={sampleItems} />);
    const button = screen.getByText('What is CruzJS?');

    fireEvent.click(button);
    const region = screen.getByRole('region', { name: 'What is CruzJS?' });
    expect(region.style.opacity).toBe('1');

    fireEvent.click(button);
    expect(region.style.opacity).toBe('0');
  });
});

// ─── Multiple mode ─────────────────────────────────────────────────────────

describe('FAQSection -- allowMultiple', () => {
  it('allows multiple items to be open simultaneously', () => {
    render(<FAQSection items={sampleItems} allowMultiple />);

    fireEvent.click(screen.getByText('What is CruzJS?'));
    fireEvent.click(screen.getByText('How do I deploy?'));

    const region1 = screen.getByRole('region', { name: 'What is CruzJS?' });
    const region2 = screen.getByRole('region', { name: 'How do I deploy?' });

    expect(region1.style.opacity).toBe('1');
    expect(region2.style.opacity).toBe('1');
  });
});

// ─── Search ────────────────────────────────────────────────────────────────

describe('FAQSection -- search', () => {
  it('filters questions by search query', () => {
    render(<FAQSection items={sampleItems} showSearch />);
    const searchInput = screen.getByPlaceholderText('Search questions...');

    fireEvent.change(searchInput, { target: { value: 'deploy' } });

    expect(screen.getByText('How do I deploy?')).toBeInTheDocument();
    expect(screen.queryByText('What is CruzJS?')).not.toBeInTheDocument();
    expect(screen.queryByText('Is it free?')).not.toBeInTheDocument();
  });

  it('shows all items when search is empty', () => {
    render(<FAQSection items={sampleItems} showSearch />);
    const searchInput = screen.getByPlaceholderText('Search questions...');

    // Type something then clear
    fireEvent.change(searchInput, { target: { value: 'deploy' } });
    fireEvent.change(searchInput, { target: { value: '' } });

    for (const item of sampleItems) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it('shows empty state when no items match search', () => {
    render(<FAQSection items={sampleItems} showSearch />);
    const searchInput = screen.getByPlaceholderText('Search questions...');

    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByTestId('faq-empty')).toBeInTheDocument();
    expect(screen.getByText('No matching questions found.')).toBeInTheDocument();
  });

  it('uses custom search placeholder', () => {
    render(<FAQSection items={sampleItems} showSearch searchPlaceholder="Find answers..." />);
    expect(screen.getByPlaceholderText('Find answers...')).toBeInTheDocument();
  });
});

// ─── Category tabs ─────────────────────────────────────────────────────────

describe('FAQSection -- categories', () => {
  it('renders category tab buttons', () => {
    render(<FAQSection items={sampleItems} categories={['General', 'Technical']} />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
  });

  it('filters items by category when a tab is clicked', () => {
    render(<FAQSection items={sampleItems} categories={['General', 'Technical']} />);

    fireEvent.click(screen.getByText('Technical'));

    expect(screen.getByText('How do I deploy?')).toBeInTheDocument();
    expect(screen.getByText('What databases are supported?')).toBeInTheDocument();
    expect(screen.queryByText('What is CruzJS?')).not.toBeInTheDocument();
    expect(screen.queryByText('Is it free?')).not.toBeInTheDocument();
  });

  it('shows all items when "All" tab is clicked', () => {
    render(<FAQSection items={sampleItems} categories={['General', 'Technical']} />);

    // Select a category, then go back to All
    fireEvent.click(screen.getByText('Technical'));
    fireEvent.click(screen.getByText('All'));

    for (const item of sampleItems) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });
});

// ─── Heading & description ─────────────────────────────────────────────────

describe('FAQSection -- heading & description', () => {
  it('renders heading text', () => {
    render(<FAQSection items={sampleItems} heading="Frequently Asked Questions" />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('renders heading as ReactNode', () => {
    render(
      <FAQSection
        items={sampleItems}
        heading={<span data-testid="custom-heading">FAQ</span>}
      />,
    );
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(
      <FAQSection
        items={sampleItems}
        heading="FAQ"
        description="Find answers to common questions."
      />,
    );
    expect(screen.getByText('Find answers to common questions.')).toBeInTheDocument();
  });

  it('does not render heading block when both heading and description are omitted', () => {
    const { container } = render(<FAQSection items={sampleItems} />);
    expect(container.querySelector('h2')).not.toBeInTheDocument();
  });
});

// ─── Custom className ──────────────────────────────────────────────────────

describe('FAQSection -- custom className', () => {
  it('merges custom className', () => {
    render(<FAQSection items={sampleItems} className="my-custom-class" />);
    const section = screen.getByTestId('faq-section');
    expect(section.className).toContain('my-custom-class');
  });
});

// ─── Ref forwarding ────────────────────────────────────────────────────────

describe('FAQSection -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<FAQSection ref={ref} items={sampleItems} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
