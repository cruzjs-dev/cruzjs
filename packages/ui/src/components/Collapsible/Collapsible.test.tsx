import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Collapsible } from './Collapsible';

describe('Collapsible', () => {
  it('renders trigger text', () => {
    render(
      <Collapsible trigger="Toggle me">
        Hidden content
      </Collapsible>,
    );
    expect(screen.getByText('Toggle me')).toBeInTheDocument();
  });

  it('hides content by default', () => {
    render(
      <Collapsible trigger="Toggle">
        Secret content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles content on click', () => {
    render(
      <Collapsible trigger="Toggle">
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports controlled mode', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Collapsible trigger="Toggle" open={false} onOpenChange={onOpenChange}>
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Still false because parent hasn't updated the prop
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Parent updates prop
    rerender(
      <Collapsible trigger="Toggle" open={true} onOpenChange={onOpenChange}>
        Content
      </Collapsible>,
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('respects defaultOpen', () => {
    render(
      <Collapsible trigger="Toggle" defaultOpen>
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not toggle when disabled', () => {
    render(
      <Collapsible trigger="Toggle" disabled>
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded attribute on trigger', () => {
    render(
      <Collapsible trigger="Toggle">
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded');
  });

  it('fires onOpenChange callback', () => {
    const onOpenChange = vi.fn();
    render(
      <Collapsible trigger="Toggle" onOpenChange={onOpenChange}>
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('applies custom className', () => {
    const { container } = render(
      <Collapsible trigger="Toggle" className="custom-class">
        Content
      </Collapsible>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has content region with role="region"', () => {
    render(
      <Collapsible trigger="Toggle">
        Content
      </Collapsible>,
    );
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('links trigger and content with aria attributes', () => {
    render(
      <Collapsible trigger="Toggle">
        Content
      </Collapsible>,
    );
    const trigger = screen.getByRole('button');
    const region = screen.getByRole('region');

    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(region).toHaveAttribute('id', controlsId);
    expect(region).toHaveAttribute('aria-labelledby', trigger.id);
  });
});
