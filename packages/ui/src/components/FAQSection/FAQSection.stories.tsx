import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FAQSection } from './FAQSection';
import type { FAQItem } from './FAQSection';

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/FAQSection',
  component: FAQSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Accordion-based FAQ section for marketing and support pages. Supports optional search filtering and category tabs.',
      },
    },
  },
  argTypes: {
    showSearch: { control: 'boolean' },
    allowMultiple: { control: 'boolean' },
  },
} satisfies Meta<typeof FAQSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Shared data ────────────────────────────────────────────────────────────

const generalItems: FAQItem[] = [
  {
    id: 'what-is',
    question: 'What is CruzJS?',
    answer: 'CruzJS is a full-stack TypeScript framework for building SaaS applications. It provides auth, billing, teams, and permissions out of the box so you can focus on your product.',
    category: 'General',
  },
  {
    id: 'free',
    question: 'Is CruzJS free to use?',
    answer: 'Yes! CruzJS is open source and free to use. We also offer a Pro tier with advanced features like audit logging and billing integrations.',
    category: 'General',
  },
  {
    id: 'deploy',
    question: 'How do I deploy my app?',
    answer: 'Run "cruz deploy" from your project root. CruzJS supports Cloudflare Pages, AWS, GCP, Azure, and Docker out of the box.',
    category: 'Technical',
  },
  {
    id: 'database',
    question: 'What databases are supported?',
    answer: 'CruzJS uses Drizzle ORM with D1 (Cloudflare) in production and SQLite for local development. The adapter system supports additional database backends.',
    category: 'Technical',
  },
  {
    id: 'auth',
    question: 'Does CruzJS include authentication?',
    answer: 'Yes. CruzJS ships with email/password auth, magic links, OAuth providers, and multi-factor authentication. All fully customizable.',
    category: 'Features',
  },
  {
    id: 'billing',
    question: 'How does billing integration work?',
    answer: 'The Pro package includes Stripe integration with subscription management, usage-based billing, and a customer billing portal.',
    category: 'Features',
  },
];

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    items: generalItems,
  },
};

// ─── WithSearch ─────────────────────────────────────────────────────────────

export const WithSearch: Story = {
  args: {
    items: generalItems,
    heading: 'Frequently Asked Questions',
    description: 'Can\'t find what you\'re looking for? Contact our support team.',
    showSearch: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'FAQ section with a search input to filter questions by keyword.',
      },
    },
  },
};

// ─── WithCategories ─────────────────────────────────────────────────────────

export const WithCategories: Story = {
  args: {
    items: generalItems,
    heading: 'Help Center',
    categories: ['General', 'Technical', 'Features'],
  },
  parameters: {
    docs: {
      description: {
        story: 'FAQ section with pill-style category tabs to filter questions by topic.',
      },
    },
  },
};

// ─── AllowMultiple ──────────────────────────────────────────────────────────

export const AllowMultiple: Story = {
  args: {
    items: generalItems,
    heading: 'FAQ',
    allowMultiple: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple accordion items can be expanded simultaneously.',
      },
    },
  },
};

// ─── WithHeading ────────────────────────────────────────────────────────────

export const WithHeading: Story = {
  args: {
    items: generalItems,
    heading: 'Got questions? We have answers.',
    description: 'Everything you need to know about CruzJS. If you have additional questions, reach out to our team.',
  },
  parameters: {
    docs: {
      description: {
        story: 'FAQ section with a prominent heading and description.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    items: generalItems,
    heading: 'FAQ',
    showSearch: true,
    categories: ['General', 'Technical', 'Features'],
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'FAQSection at 375px mobile viewport width with search and categories.',
      },
    },
  },
};
