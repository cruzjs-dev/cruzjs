import type { Meta, StoryObj } from '@storybook/react';
import { Changelog } from './Changelog';
import type { ChangelogVersion } from './Changelog';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Documentation/Changelog',
  component: Changelog,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Changelog timeline for displaying version history and release notes. Supports category badges (Added, Changed, Fixed, Removed, Deprecated, Security), timeline connectors, optional version links, and custom link renderers.',
      },
    },
  },
} satisfies Meta<typeof Changelog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ──────────────────────────────────────────────────────────────────

const defaultVersions: ChangelogVersion[] = [
  {
    version: '2.1.0',
    date: 'March 15, 2025',
    changes: [
      { description: 'Dark mode support across all components', category: 'added' },
      { description: 'New keyboard shortcuts for navigation', category: 'added' },
      { description: 'Improved loading states with skeleton screens', category: 'changed' },
      { description: 'Fixed sidebar collapse animation glitch', category: 'fixed' },
      { description: 'Fixed incorrect date formatting in ActivityFeed', category: 'fixed' },
    ],
  },
  {
    version: '2.0.0',
    date: 'February 1, 2025',
    changes: [
      { description: 'Completely redesigned dashboard layout', category: 'added' },
      { description: 'New tRPC-based API layer', category: 'added' },
      { description: 'Migrated from REST to tRPC for all endpoints', category: 'changed' },
      { description: 'Removed legacy jQuery dependencies', category: 'removed' },
      { description: 'Deprecated v1 API routes (will be removed in v3)', category: 'deprecated' },
    ],
  },
  {
    version: '1.0.0',
    date: 'January 1, 2025',
    changes: [
      { description: 'Initial public release', category: 'added' },
      { description: 'Authentication with email/password and OAuth', category: 'added' },
      { description: 'Organization management with RBAC', category: 'added' },
    ],
  },
];

export const Default: Story = {
  args: {
    versions: defaultVersions,
  },
  parameters: {
    docs: {
      description: {
        story: 'A typical changelog with multiple versions, each containing changes grouped by category with timeline connectors.',
      },
    },
  },
};

// ─── SingleVersion ────────────────────────────────────────────────────────────

const singleVersionData: ChangelogVersion[] = [
  {
    version: '0.1.0',
    date: 'December 20, 2024',
    changes: [
      { description: 'Project scaffolding and initial setup', category: 'added' },
      { description: 'Basic authentication flow', category: 'added' },
      { description: 'Database schema and migrations', category: 'added' },
    ],
  },
];

export const SingleVersion: Story = {
  args: {
    versions: singleVersionData,
  },
  parameters: {
    docs: {
      description: {
        story: 'A changelog with only one version entry. No timeline connector is rendered since there is nothing to connect to.',
      },
    },
  },
};

// ─── WithLinks ────────────────────────────────────────────────────────────────

const withLinksVersions: ChangelogVersion[] = [
  {
    version: '3.0.0',
    date: 'April 10, 2025',
    href: 'https://github.com/cruzjs/cruzjs/releases/tag/v3.0.0',
    changes: [
      { description: 'Multi-cloud adapter support (AWS, GCP, Azure)', category: 'added' },
      { description: 'New module system with @Module decorator', category: 'added' },
      { description: 'Updated Drizzle ORM to v0.40', category: 'changed' },
    ],
  },
  {
    version: '2.5.0',
    date: 'March 20, 2025',
    href: 'https://github.com/cruzjs/cruzjs/releases/tag/v2.5.0',
    changes: [
      { description: 'Background job processing with Queues', category: 'added' },
      { description: 'Fixed race condition in org switching', category: 'fixed' },
      { description: 'Patched XSS vulnerability in rich text editor', category: 'security' },
    ],
  },
];

export const WithLinks: Story = {
  args: {
    versions: withLinksVersions,
  },
  parameters: {
    docs: {
      description: {
        story: 'Version numbers rendered as clickable links pointing to GitHub releases. Use the `renderLink` prop to integrate with React Router or other routing libraries.',
      },
    },
  },
};

// ─── ManyCategories ───────────────────────────────────────────────────────────

const manyCategoriesVersions: ChangelogVersion[] = [
  {
    version: '4.0.0',
    date: 'June 1, 2025',
    changes: [
      { description: 'Real-time collaboration with WebSockets', category: 'added' },
      { description: 'AI-powered code suggestions', category: 'added' },
      { description: 'Redesigned settings pages', category: 'changed' },
      { description: 'Updated notification preferences UI', category: 'changed' },
      { description: 'Fixed file upload timeout on large files', category: 'fixed' },
      { description: 'Fixed pagination off-by-one error', category: 'fixed' },
      { description: 'Removed support for Node.js 16', category: 'removed' },
      { description: 'Deprecated `useOrgContext` hook (use `useOrg` instead)', category: 'deprecated' },
      { description: 'Patched CSRF token validation bypass', category: 'security' },
      { description: 'Updated dependencies to address CVE-2025-1234', category: 'security' },
    ],
  },
];

export const ManyCategories: Story = {
  args: {
    versions: manyCategoriesVersions,
  },
  parameters: {
    docs: {
      description: {
        story: 'A single version with all six change categories represented: Added, Changed, Fixed, Removed, Deprecated, and Security.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    versions: defaultVersions,
  },
  render: (args) => (
    <div className="p-4">
      <Changelog {...args} />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Changelog rendered at 375px mobile viewport width. The layout adapts naturally since it uses a vertical timeline.',
      },
    },
  },
};
