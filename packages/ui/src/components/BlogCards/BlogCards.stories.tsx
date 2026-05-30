import type { Meta, StoryObj } from '@storybook/react';
import { BlogCards } from './BlogCards';
import type { BlogArticle } from './BlogCards';

// ─── Article fixtures ──────────────────────────────────────────────────────

const sampleArticles: BlogArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with CruzJS',
    excerpt:
      'Learn how to scaffold, develop, and deploy a full-stack app on Cloudflare with CruzJS in under 10 minutes.',
    coverImage: 'https://picsum.photos/seed/blog1/800/450',
    author: { name: 'Jane Doe', avatarSrc: 'https://i.pravatar.cc/48?u=jane' },
    date: 'Jan 15, 2026',
    tags: ['Tutorial', 'Getting Started'],
    href: '/blog/getting-started',
  },
  {
    id: 'trpc-patterns',
    title: 'Advanced tRPC Router Patterns',
    excerpt:
      'Deep dive into middleware composition, procedure chaining, and org-scoped procedures for multi-tenant apps.',
    coverImage: 'https://picsum.photos/seed/blog2/800/450',
    author: { name: 'John Smith', avatarSrc: 'https://i.pravatar.cc/48?u=john' },
    date: 'Feb 20, 2026',
    tags: ['Advanced', 'tRPC'],
    href: '/blog/advanced-trpc',
  },
  {
    id: 'cloudflare-deploy',
    title: 'Zero-Downtime Deploys on Cloudflare',
    excerpt:
      'Step-by-step guide to deploying CruzJS apps with database migrations, KV, and R2 bindings.',
    coverImage: 'https://picsum.photos/seed/blog3/800/450',
    author: { name: 'Alice Chen', avatarSrc: 'https://i.pravatar.cc/48?u=alice' },
    date: 'Mar 5, 2026',
    tags: ['DevOps', 'Cloudflare'],
    href: '/blog/deploying-cloudflare',
  },
  {
    id: 'drizzle-d1',
    title: 'Drizzle ORM with Cloudflare D1',
    excerpt:
      'How to model your schema, run migrations, and write type-safe queries with Drizzle and D1.',
    coverImage: 'https://picsum.photos/seed/blog4/800/450',
    author: { name: 'Bob Wilson' },
    date: 'Apr 12, 2026',
    tags: ['Database', 'Drizzle'],
    href: '/blog/drizzle-d1',
  },
];

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/BlogCards',
  component: BlogCards,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive grid of article preview cards with cover images, tag badges, and author lines. Zero domain coupling.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [2, 3, 4] },
  },
  args: {
    articles: sampleArticles.slice(0, 3),
  },
} satisfies Meta<typeof BlogCards>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── TwoColumns ─────────────────────────────────────────────────────────────

export const TwoColumns: Story = {
  render: () => <BlogCards articles={sampleArticles.slice(0, 2)} columns={2} />,
  parameters: {
    docs: {
      description: {
        story: 'Two-column layout for featured or side-by-side articles.',
      },
    },
  },
};

// ─── WithTags ───────────────────────────────────────────────────────────────

export const WithTags: Story = {
  render: () => (
    <BlogCards
      articles={sampleArticles.map((a) => ({
        ...a,
        tags: ['React', 'TypeScript', 'Cloudflare', 'tRPC'],
      }))}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Articles with multiple tag badges wrapping across lines.',
      },
    },
  },
};

// ─── NoImages ───────────────────────────────────────────────────────────────

export const NoImages: Story = {
  render: () => (
    <BlogCards
      articles={sampleArticles.map(({ coverImage: _img, ...rest }) => rest)}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Articles without cover images — content-only cards.',
      },
    },
  },
};

// ─── WithHeading ────────────────────────────────────────────────────────────

export const WithHeading: Story = {
  render: () => (
    <BlogCards articles={sampleArticles.slice(0, 3)} heading="Latest from the Blog" />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Section heading rendered above the card grid.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <BlogCards articles={sampleArticles.slice(0, 3)} heading="Latest Articles" />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'BlogCards at 375px mobile viewport width, stacked single column.',
      },
    },
  },
};
