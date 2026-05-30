import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingChecklist, OnboardingTask } from './OnboardingChecklist';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseTasks: OnboardingTask[] = [
  { id: '1', title: 'Create account', completed: true },
  { id: '2', title: 'Verify email', description: 'Check your inbox', completed: true },
  { id: '3', title: 'Set up profile', completed: false },
  { id: '4', title: 'Invite team', completed: false },
  { id: '5', title: 'Start building', completed: false },
];

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('OnboardingChecklist -- rendering', () => {
  it('renders title', () => {
    render(<OnboardingChecklist tasks={baseTasks} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<OnboardingChecklist tasks={baseTasks} title="Setup Guide" />);
    expect(screen.getByText('Setup Guide')).toBeInTheDocument();
  });

  it('renders tasks', () => {
    render(<OnboardingChecklist tasks={baseTasks} />);
    expect(screen.getByText('Create account')).toBeInTheDocument();
    expect(screen.getByText('Verify email')).toBeInTheDocument();
    expect(screen.getByText('Set up profile')).toBeInTheDocument();
    expect(screen.getByText('Invite team')).toBeInTheDocument();
    expect(screen.getByText('Start building')).toBeInTheDocument();
  });

  it('shows progress text', () => {
    render(<OnboardingChecklist tasks={baseTasks} />);
    expect(screen.getByText('2 of 5 complete')).toBeInTheDocument();
  });

  it('renders completed tasks with visual distinction', () => {
    render(<OnboardingChecklist tasks={baseTasks} />);
    const completedTitle = screen.getByText('Create account');
    expect(completedTitle.className).toContain('line-through');
    expect(completedTitle.className).toContain('text-text-tertiary');

    const incompleteTitle = screen.getByText('Set up profile');
    expect(incompleteTitle.className).not.toContain('line-through');
    expect(incompleteTitle.className).toContain('text-text');
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('OnboardingChecklist -- interactions', () => {
  it('calls onTaskToggle on task click', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    render(<OnboardingChecklist tasks={baseTasks} onTaskToggle={handleToggle} />);

    await user.click(screen.getByText('Set up profile'));
    expect(handleToggle).toHaveBeenCalledWith('3', true);
  });

  it('calls onTaskToggle to uncomplete a completed task', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    render(<OnboardingChecklist tasks={baseTasks} onTaskToggle={handleToggle} />);

    await user.click(screen.getByText('Create account'));
    expect(handleToggle).toHaveBeenCalledWith('1', false);
  });

  it('calls onDismiss on dismiss click', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(<OnboardingChecklist tasks={baseTasks} onDismiss={handleDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(<OnboardingChecklist tasks={baseTasks} />);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });
});

// ─── Collapsible ──────────────────────────────────────────────────────────────

describe('OnboardingChecklist -- collapsible', () => {
  it('collapses and expands when collapsible', async () => {
    const user = userEvent.setup();
    render(<OnboardingChecklist tasks={baseTasks} collapsible defaultExpanded />);

    // Initially expanded - tasks should be visible
    expect(screen.getByText('Set up profile')).toBeInTheDocument();

    // Click the toggle button to collapse
    const toggleButton = screen.getByRole('button', { expanded: true });
    await user.click(toggleButton);

    // The button should now indicate collapsed state
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts collapsed when defaultExpanded is false', () => {
    render(<OnboardingChecklist tasks={baseTasks} collapsible defaultExpanded={false} />);

    const toggleButton = screen.getByRole('button', { expanded: false });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });
});

// ─── Action Buttons ───────────────────────────────────────────────────────────

describe('OnboardingChecklist -- action buttons', () => {
  it('renders action buttons for incomplete tasks', () => {
    const tasksWithActions: OnboardingTask[] = [
      {
        id: '1',
        title: 'Set up profile',
        completed: false,
        action: { label: 'Go to settings', onClick: vi.fn() },
      },
    ];
    render(<OnboardingChecklist tasks={tasksWithActions} />);
    expect(screen.getByText('Go to settings')).toBeInTheDocument();
  });

  it('renders action links for incomplete tasks', () => {
    const tasksWithLinks: OnboardingTask[] = [
      {
        id: '1',
        title: 'Read the docs',
        completed: false,
        action: { label: 'Open docs', href: '/docs' },
      },
    ];
    render(<OnboardingChecklist tasks={tasksWithLinks} />);
    const link = screen.getByText('Open docs');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/docs');
  });

  it('does not render action buttons for completed tasks', () => {
    const tasksWithActions: OnboardingTask[] = [
      {
        id: '1',
        title: 'Set up profile',
        completed: true,
        action: { label: 'Go to settings', onClick: vi.fn() },
      },
    ];
    render(<OnboardingChecklist tasks={tasksWithActions} />);
    expect(screen.queryByText('Go to settings')).not.toBeInTheDocument();
  });

  it('calls action onClick when action button is clicked', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();
    const tasksWithActions: OnboardingTask[] = [
      {
        id: '1',
        title: 'Set up profile',
        completed: false,
        action: { label: 'Go to settings', onClick: handleAction },
      },
    ];
    render(<OnboardingChecklist tasks={tasksWithActions} />);
    await user.click(screen.getByText('Go to settings'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

// ─── All Complete ─────────────────────────────────────────────────────────────

describe('OnboardingChecklist -- all complete', () => {
  it('shows celebration state when all tasks are complete', () => {
    const allComplete: OnboardingTask[] = baseTasks.map((t) => ({ ...t, completed: true }));
    render(<OnboardingChecklist tasks={allComplete} />);
    expect(screen.getByText('All done!')).toBeInTheDocument();
    expect(screen.getByText('5 of 5 complete')).toBeInTheDocument();
  });
});
