import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HelpCenter } from './HelpCenter';
import type { HelpCategory, HelpArticle } from './HelpCenter';

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/HelpCenter',
  component: HelpCenter,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Help center landing page block with prominent search, category cards, and popular articles list.',
      },
    },
  },
} satisfies Meta<typeof HelpCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Shared data ────────────────────────────────────────────────────────────

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const RocketIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const allCategories: HelpCategory[] = [
  { id: 'getting-started', title: 'Getting Started', description: 'Set up your account and build your first project', icon: <BookIcon />, articleCount: 12, href: '/help/getting-started' },
  { id: 'billing', title: 'Billing & Plans', description: 'Manage subscriptions, invoices, and payments', icon: <CreditCardIcon />, articleCount: 8, href: '/help/billing' },
  { id: 'api', title: 'API Reference', description: 'Endpoints, authentication, and rate limits', icon: <CodeIcon />, articleCount: 24, href: '/help/api' },
  { id: 'security', title: 'Security', description: 'Permissions, SSO, and data protection', icon: <ShieldIcon />, articleCount: 6, href: '/help/security' },
  { id: 'teams', title: 'Teams & Orgs', description: 'Invite members, roles, and collaboration', icon: <UsersIcon />, articleCount: 10, href: '/help/teams' },
  { id: 'deploy', title: 'Deployment', description: 'Ship to Cloudflare, AWS, and more', icon: <RocketIcon />, articleCount: 15, href: '/help/deploy' },
];

const allArticles: HelpArticle[] = [
  { id: 'a1', title: 'How to create your first project', category: 'Getting Started', href: '/help/articles/first-project' },
  { id: 'a2', title: 'Understanding your billing dashboard', category: 'Billing', href: '/help/articles/billing-dashboard' },
  { id: 'a3', title: 'Setting up API authentication', category: 'API', href: '/help/articles/api-auth' },
  { id: 'a4', title: 'Inviting team members', category: 'Teams', href: '/help/articles/invite-members' },
  { id: 'a5', title: 'Deploying to Cloudflare Pages', category: 'Deployment', href: '/help/articles/deploy-cloudflare' },
];

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    heading: 'Help Center',
    description: 'Find answers to your questions and learn how to get the most out of CruzJS.',
    categories: allCategories,
    popularArticles: allArticles,
  },
};

// ─── WithPopularArticles ────────────────────────────────────────────────────

export const WithPopularArticles: Story = {
  args: {
    heading: 'How can we help?',
    description: 'Search our knowledge base or browse popular topics below.',
    popularArticles: allArticles,
  },
  parameters: {
    docs: {
      description: {
        story: 'Help center with only popular articles and no category cards.',
      },
    },
  },
};

// ─── MinimalCategories ──────────────────────────────────────────────────────

export const MinimalCategories: Story = {
  args: {
    heading: 'Browse Topics',
    categories: [
      { id: 'getting-started', title: 'Getting Started', articleCount: 12, href: '/help/getting-started' },
      { id: 'billing', title: 'Billing', articleCount: 8, href: '/help/billing' },
      { id: 'api', title: 'API', articleCount: 24, href: '/help/api' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal category cards without icons or descriptions.',
      },
    },
  },
};

// ─── WithSearch ─────────────────────────────────────────────────────────────

export const WithSearch: Story = {
  args: {
    heading: 'Support Center',
    description: 'Type your question below to find relevant help articles.',
    categories: allCategories.slice(0, 3),
    popularArticles: allArticles.slice(0, 3),
    searchPlaceholder: 'What do you need help with?',
    onSearch: (query: string) => console.log('Search:', query),
  },
  parameters: {
    docs: {
      description: {
        story: 'Help center with an active search callback and custom placeholder.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    heading: 'Help Center',
    description: 'Find answers quickly.',
    categories: allCategories.slice(0, 4),
    popularArticles: allArticles.slice(0, 3),
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'HelpCenter at 375px mobile viewport width.',
      },
    },
  },
};
