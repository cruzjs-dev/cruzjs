import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationPreferences } from './NotificationPreferences';
import type { NotificationCategory, NotificationChannel } from './NotificationPreferences';

const channels: NotificationChannel[] = [
  { id: 'email', label: 'Email' },
  { id: 'push', label: 'Push' },
  { id: 'in-app', label: 'In-App' },
];

const categories: NotificationCategory[] = [
  {
    id: 'activity',
    title: 'Activity',
    items: [
      {
        id: 'comments',
        label: 'Comments',
        description: 'When someone comments on your post',
        channels: { email: true, push: false, 'in-app': true },
      },
      {
        id: 'mentions',
        label: 'Mentions',
        channels: { email: false, push: true, 'in-app': true },
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    items: [
      {
        id: 'newsletter',
        label: 'Newsletter',
        channels: { email: true, push: false, 'in-app': false },
      },
    ],
  },
];

describe('NotificationPreferences', () => {
  it('renders channel headers', () => {
    render(<NotificationPreferences channels={channels} categories={categories} />);
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Push').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('In-App').length).toBeGreaterThanOrEqual(1);
  });

  it('renders category titles', () => {
    render(<NotificationPreferences channels={channels} categories={categories} />);
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('renders item labels', () => {
    render(<NotificationPreferences channels={channels} categories={categories} />);
    expect(screen.getAllByText('Comments').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mentions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Newsletter').length).toBeGreaterThanOrEqual(1);
  });

  it('renders switches for each channel', () => {
    render(<NotificationPreferences channels={channels} categories={categories} />);
    const switches = screen.getAllByRole('switch');
    // 3 items x 3 channels x 2 (desktop + mobile) = 18
    expect(switches.length).toBe(18);
  });

  it('calls onChange with correct args when switch toggled', () => {
    const onChange = vi.fn();
    render(
      <NotificationPreferences channels={channels} categories={categories} onChange={onChange} />,
    );
    // Find all switches with aria-label "Comments Email" — there are 2 (desktop + mobile)
    const commentEmailSwitches = screen.getAllByLabelText('Comments Email');
    expect(commentEmailSwitches.length).toBe(2);

    // Toggle the first one (desktop). Comments Email is currently true, so toggling yields false.
    fireEvent.click(commentEmailSwitches[0]);
    expect(onChange).toHaveBeenCalledWith('comments', 'email', false);
  });

  it('renders disabled state', () => {
    render(<NotificationPreferences channels={channels} categories={categories} disabled />);
    const switches = screen.getAllByRole('switch');
    switches.forEach((sw) => {
      expect(sw).toBeDisabled();
    });
  });

  it('renders item descriptions', () => {
    render(<NotificationPreferences channels={channels} categories={categories} />);
    expect(
      screen.getAllByText('When someone comments on your post').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('supports custom className', () => {
    const { container } = render(
      <NotificationPreferences
        channels={channels}
        categories={categories}
        className="my-custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
