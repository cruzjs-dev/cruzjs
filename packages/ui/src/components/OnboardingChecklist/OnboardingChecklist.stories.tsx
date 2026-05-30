import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { OnboardingChecklist, OnboardingTask } from './OnboardingChecklist';

// ─── Fixture Data ─────────────────────────────────────────────────────────────

const sampleTasks: OnboardingTask[] = [
  {
    id: 'account',
    title: 'Create your account',
    description: 'Sign up with email or SSO',
    completed: true,
  },
  {
    id: 'verify',
    title: 'Verify your email',
    description: 'Click the link we sent to your inbox',
    completed: true,
  },
  {
    id: 'profile',
    title: 'Set up your profile',
    description: 'Add your name and avatar',
    completed: false,
  },
  {
    id: 'team',
    title: 'Invite your team',
    description: 'Collaborate with your colleagues',
    completed: false,
  },
  {
    id: 'build',
    title: 'Start building',
    description: 'Create your first project',
    completed: false,
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/OnboardingChecklist',
  component: OnboardingChecklist,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Step-by-step onboarding task list with progress bar. Users check off tasks as they complete them. Collapsible, zero domain coupling.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    collapsible: { control: 'boolean' },
    defaultExpanded: { control: 'boolean' },
  },
  args: {
    title: 'Getting Started',
    collapsible: true,
    defaultExpanded: true,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OnboardingChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    tasks: sampleTasks,
  },
};

export const AllComplete: Story = {
  args: {
    tasks: sampleTasks.map((t) => ({ ...t, completed: true })),
  },
};

export const NoneComplete: Story = {
  args: {
    tasks: sampleTasks.map((t) => ({ ...t, completed: false })),
    description: 'Complete these steps to get the most out of the platform.',
  },
};

export const Interactive: Story = {
  render: () => {
    const [tasks, setTasks] = useState<OnboardingTask[]>(
      sampleTasks.map((t) => ({ ...t, completed: false })),
    );

    const handleToggle = (taskId: string, completed: boolean) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t)),
      );
    };

    return (
      <OnboardingChecklist
        tasks={tasks}
        onTaskToggle={handleToggle}
        description="Click tasks to toggle completion"
      />
    );
  },
};

export const Collapsed: Story = {
  args: {
    tasks: sampleTasks,
    collapsible: true,
    defaultExpanded: false,
  },
};

export const WithActions: Story = {
  args: {
    tasks: [
      {
        id: 'account',
        title: 'Create your account',
        completed: true,
        action: { label: 'View account', href: '/account' },
      },
      {
        id: 'profile',
        title: 'Set up your profile',
        description: 'Add your name and avatar',
        completed: false,
        action: { label: 'Go to settings', href: '/settings/profile' },
      },
      {
        id: 'team',
        title: 'Invite your team',
        description: 'Collaborate with your colleagues',
        completed: false,
        action: { label: 'Invite members', onClick: () => alert('Open invite modal') },
      },
      {
        id: 'api',
        title: 'Connect your API',
        completed: false,
        action: { label: 'View docs', href: '/docs/api' },
      },
    ] as OnboardingTask[],
  },
};

export const WithDismiss: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);

    if (!visible) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-text-tertiary mb-3">Checklist dismissed</p>
          <button
            type="button"
            className="text-primary text-sm font-medium hover:text-primary-dark"
            onClick={() => setVisible(true)}
          >
            Show again
          </button>
        </div>
      );
    }

    return (
      <OnboardingChecklist
        tasks={sampleTasks}
        onDismiss={() => setVisible(false)}
      />
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4">
      <OnboardingChecklist
        tasks={sampleTasks}
        onDismiss={() => {}}
        description="Complete these steps to get started"
      />
    </div>
  ),
};
