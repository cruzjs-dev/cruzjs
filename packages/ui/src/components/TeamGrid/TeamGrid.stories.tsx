import type { Meta, StoryObj } from '@storybook/react';
import { TeamGrid } from './TeamGrid';
import type { TeamMember } from './TeamGrid';

// ─── Social icons for stories ───────────────────────────────────────────────

const TwitterIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const GitHubIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// ─── Member fixtures ────────────────────────────────────────────────────────

const defaultMembers: TeamMember[] = [
  {
    id: 'alice',
    name: 'Alice Johnson',
    role: 'CEO & Co-founder',
    avatarSrc: 'https://i.pravatar.cc/200?u=alice',
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    role: 'CTO & Co-founder',
    avatarSrc: 'https://i.pravatar.cc/200?u=bob',
  },
  {
    id: 'carol',
    name: 'Carol Williams',
    role: 'VP Engineering',
    avatarSrc: 'https://i.pravatar.cc/200?u=carol',
  },
  {
    id: 'dave',
    name: 'Dave Chen',
    role: 'Head of Design',
    avatarSrc: 'https://i.pravatar.cc/200?u=dave',
  },
  {
    id: 'eve',
    name: 'Eve Martinez',
    role: 'Lead Engineer',
    avatarSrc: 'https://i.pravatar.cc/200?u=eve',
  },
  {
    id: 'frank',
    name: 'Frank Lee',
    role: 'Product Manager',
    avatarSrc: 'https://i.pravatar.cc/200?u=frank',
  },
];

const membersWithBios: TeamMember[] = defaultMembers.map((m) => ({
  ...m,
  bio: {
    alice: 'Former VP at Stripe. Passionate about building developer tools that scale.',
    bob: '15 years in distributed systems. Previously at Google Cloud and AWS.',
    carol: 'Open-source contributor and Rust enthusiast. Built teams from 5 to 50.',
    dave: 'Design systems nerd. Believes in accessible, beautiful interfaces.',
    eve: 'Full-stack polyglot. TypeScript, Go, and Rust are her daily drivers.',
    frank: 'Data-driven PM. Shipped products used by millions at Meta.',
  }[m.id],
}));

const membersWithSocials: TeamMember[] = defaultMembers.map((m) => ({
  ...m,
  socialLinks: [
    { platform: 'Twitter', href: `https://twitter.com/${m.id}`, icon: <TwitterIcon /> },
    { platform: 'LinkedIn', href: `https://linkedin.com/in/${m.id}`, icon: <LinkedInIcon /> },
    { platform: 'GitHub', href: `https://github.com/${m.id}`, icon: <GitHubIcon /> },
  ],
}));

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/TeamGrid',
  component: TeamGrid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive team member card grid for marketing pages. Displays team members with avatars, roles, bios, and social links with hover reveal.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [2, 3, 4] },
  },
  args: {
    members: defaultMembers,
    heading: 'Meet Our Team',
    description: 'The talented people behind our product.',
    columns: 3,
  },
} satisfies Meta<typeof TeamGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── TwoColumns ─────────────────────────────────────────────────────────────

export const TwoColumns: Story = {
  args: {
    columns: 2,
    members: defaultMembers.slice(0, 4),
  },
  parameters: {
    docs: {
      description: { story: 'Two-column layout with four team members.' },
    },
  },
};

// ─── FourColumns ────────────────────────────────────────────────────────────

export const FourColumns: Story = {
  args: {
    columns: 4,
    members: defaultMembers.slice(0, 4),
  },
  parameters: {
    docs: {
      description: { story: 'Four-column layout for wider viewports.' },
    },
  },
};

// ─── WithBios ───────────────────────────────────────────────────────────────

export const WithBios: Story = {
  args: {
    members: membersWithBios,
  },
  parameters: {
    docs: {
      description: { story: 'Team members with short biography text under their role.' },
    },
  },
};

// ─── WithSocialLinks ────────────────────────────────────────────────────────

export const WithSocialLinks: Story = {
  args: {
    members: membersWithSocials,
  },
  parameters: {
    docs: {
      description: { story: 'Team members with social link icons that appear on card hover.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <TeamGrid
        members={defaultMembers.slice(0, 3)}
        heading="Our Team"
        description="The people building the future."
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'TeamGrid at 375px mobile viewport width, stacked single column.' },
    },
  },
};
