import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsSection } from './SettingsSection';

describe('SettingsSection', () => {
  it('renders title', () => {
    render(
      <SettingsSection title="Account Settings">
        <p>Content</p>
      </SettingsSection>,
    );
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(
      <SettingsSection title="Account" description="Manage your account settings">
        <p>Content</p>
      </SettingsSection>,
    );
    expect(screen.getByText('Manage your account settings')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <SettingsSection title="Account">
        <input placeholder="Name" />
      </SettingsSection>,
    );
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
  });

  it('renders actions', () => {
    render(
      <SettingsSection
        title="Account"
        actions={<button type="button">Save</button>}
      >
        <p>Content</p>
      </SettingsSection>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders danger variant with correct styling intent', () => {
    const { container } = render(
      <SettingsSection title="Delete Account" danger>
        <p>This action is irreversible</p>
      </SettingsSection>,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain('ring-danger/20');
    expect(root?.className).not.toContain('ring-surface-border/50');
  });

  it('renders icon', () => {
    render(
      <SettingsSection
        title="Account"
        icon={<span data-testid="settings-icon">IC</span>}
      >
        <p>Content</p>
      </SettingsSection>,
    );
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('renders badge', () => {
    render(
      <SettingsSection
        title="AI Features"
        badge={<span data-testid="beta-badge">Beta</span>}
      >
        <p>Content</p>
      </SettingsSection>,
    );
    expect(screen.getByTestId('beta-badge')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('collapses and expands when collapsible', () => {
    render(
      <SettingsSection title="Advanced" collapsible defaultExpanded={false}>
        <p>Hidden content</p>
      </SettingsSection>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports custom className', () => {
    const { container } = render(
      <SettingsSection title="Account" className="my-custom-class">
        <p>Content</p>
      </SettingsSection>,
    );
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });
});
