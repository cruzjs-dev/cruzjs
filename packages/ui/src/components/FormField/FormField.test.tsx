import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders children', () => {
    render(
      <FormField>
        <input placeholder="test" />
      </FormField>,
    );
    expect(screen.getByPlaceholderText('test')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('connects label to input via htmlFor', () => {
    render(
      <FormField label="Name" htmlFor="name-input">
        <input id="name-input" />
      </FormField>,
    );
    const label = screen.getByText('Name');
    expect(label).toHaveAttribute('for', 'name-input');
  });

  it('renders description when no error', () => {
    render(
      <FormField label="Email" description="Your work email">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Your work email')).toBeInTheDocument();
  });

  it('hides description when error is present', () => {
    render(
      <FormField label="Email" description="Your work email" error="Required">
        <input />
      </FormField>,
    );
    expect(screen.queryByText('Your work email')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('renders error with role="alert"', () => {
    render(
      <FormField error="Invalid email">
        <input />
      </FormField>,
    );
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Invalid email');
  });

  it('shows required asterisk', () => {
    render(
      <FormField label="Name" required>
        <input />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show asterisk when not required', () => {
    render(
      <FormField label="Name">
        <input />
      </FormField>,
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('sets data-error attribute when error is present', () => {
    const { container } = render(
      <FormField error="Bad">
        <input />
      </FormField>,
    );
    expect(container.firstElementChild).toHaveAttribute('data-error', 'true');
  });

  it('does not set data-error attribute when no error', () => {
    const { container } = render(
      <FormField>
        <input />
      </FormField>,
    );
    expect(container.firstElementChild).not.toHaveAttribute('data-error');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField className="my-custom-class">
        <input />
      </FormField>,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });

  it('applies size sm styles to label', () => {
    render(
      <FormField label="Small" size="sm">
        <input />
      </FormField>,
    );
    const label = screen.getByText('Small');
    expect(label.className).toContain('text-xs');
  });

  it('applies size lg styles to label', () => {
    render(
      <FormField label="Large" size="lg">
        <input />
      </FormField>,
    );
    const label = screen.getByText('Large');
    expect(label.className).toContain('text-sm');
  });

  it('forwards ref to wrapper div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <FormField ref={ref}>
        <input />
      </FormField>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through additional HTML attributes', () => {
    const { container } = render(
      <FormField data-testid="my-field" aria-label="custom">
        <input />
      </FormField>,
    );
    expect(container.firstElementChild).toHaveAttribute('data-testid', 'my-field');
    expect(container.firstElementChild).toHaveAttribute('aria-label', 'custom');
  });

  it('renders label as ReactNode', () => {
    render(
      <FormField label={<span data-testid="custom-label">Custom</span>}>
        <input />
      </FormField>,
    );
    expect(screen.getByTestId('custom-label')).toBeInTheDocument();
  });
});
