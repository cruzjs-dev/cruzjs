import type { Meta, StoryObj } from '@storybook/react';
import { DocHeader } from './DocHeader';

// ─── Breadcrumb helper for stories ─────────────────────────────────────────

const Breadcrumb: React.FC<{ items: string[] }> = ({ items }) => (
  <nav className="flex items-center gap-1.5 text-sm text-text-tertiary">
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1.5">
        {i > 0 && <span aria-hidden="true">/</span>}
        <span className={i === items.length - 1 ? 'text-text-secondary font-medium' : ''}>
          {item}
        </span>
      </span>
    ))}
  </nav>
);

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Documentation/DocHeader',
  component: DocHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Documentation page header with title, breadcrumb trail, description, edit link, and metadata. Designed for documentation sites and knowledge bases.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    editUrl: { control: 'text' },
    editLabel: { control: 'text' },
    lastUpdated: { control: 'text' },
    readingTime: { control: 'text' },
  },
  args: {
    title: 'Getting Started',
  },
} satisfies Meta<typeof DocHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithBreadcrumbs ────────────────────────────────────────────────────────

export const WithBreadcrumbs: Story = {
  render: () => (
    <DocHeader
      title="Configuration"
      description="Learn how to configure your project settings."
      breadcrumbs={<Breadcrumb items={['Docs', 'Guide', 'Configuration']} />}
    />
  ),
  parameters: {
    docs: {
      description: { story: 'DocHeader with a breadcrumb trail above the title.' },
    },
  },
};

// ─── WithEditLink ───────────────────────────────────────────────────────────

export const WithEditLink: Story = {
  render: () => (
    <DocHeader
      title="API Reference"
      description="Complete reference for all available API endpoints."
      editUrl="https://github.com/cruzjs/cruzjs/edit/main/docs/api-reference.md"
    />
  ),
  parameters: {
    docs: {
      description: { story: 'DocHeader with an "Edit this page" link aligned to the right.' },
    },
  },
};

// ─── WithMetadata ───────────────────────────────────────────────────────────

export const WithMetadata: Story = {
  render: () => (
    <DocHeader
      title="Authentication Guide"
      description="Set up authentication and authorization for your application."
      lastUpdated="January 15, 2026"
      readingTime="8 min read"
    />
  ),
  parameters: {
    docs: {
      description: { story: 'DocHeader with last-updated date and reading time metadata.' },
    },
  },
};

// ─── FullExample ────────────────────────────────────────────────────────────

export const FullExample: Story = {
  render: () => (
    <DocHeader
      title="Database Migrations"
      description="How to create, run, and manage database migrations with Drizzle ORM."
      breadcrumbs={<Breadcrumb items={['Documentation', 'Database', 'Migrations']} />}
      editUrl="https://github.com/cruzjs/cruzjs/edit/main/docs/database/migrations.md"
      lastUpdated="March 10, 2026"
      readingTime="12 min read"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full DocHeader with breadcrumbs, edit link, description, and metadata.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <DocHeader
        title="Quick Start"
        description="Get up and running in under 5 minutes."
        breadcrumbs={<Breadcrumb items={['Docs', 'Quick Start']} />}
        editUrl="https://github.com/cruzjs/cruzjs/edit/main/docs/quick-start.md"
        lastUpdated="February 1, 2026"
        readingTime="3 min read"
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'DocHeader rendered at 375px mobile viewport width.' },
    },
  },
};
