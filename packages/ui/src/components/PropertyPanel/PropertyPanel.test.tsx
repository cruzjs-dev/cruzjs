import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PropertyPanel } from './PropertyPanel';

describe('PropertyPanel', () => {
  it('renders title', () => {
    render(<PropertyPanel title="Inspector" />);
    expect(screen.getByText('Inspector')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<PropertyPanel title="Inspector" subtitle="Edit properties" />);
    expect(screen.getByText('Edit properties')).toBeInTheDocument();
  });

  it('renders section titles', () => {
    render(
      <PropertyPanel
        sections={[
          { title: 'General', children: <div>General content</div> },
          { title: 'Appearance', children: <div>Appearance content</div> },
        ]}
      />,
    );
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('collapses and expands sections on click', () => {
    render(
      <PropertyPanel
        sections={[
          { title: 'General', children: <div>General content</div> },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /general/i });

    // Default is expanded
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders close button and calls onClose', () => {
    const onClose = vi.fn();
    render(<PropertyPanel title="Inspector" onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close panel');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer content', () => {
    render(
      <PropertyPanel
        title="Inspector"
        footer={<button>Save</button>}
      />,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders children when no sections', () => {
    render(
      <PropertyPanel title="Inspector">
        <div>Custom child content</div>
      </PropertyPanel>,
    );
    expect(screen.getByText('Custom child content')).toBeInTheDocument();
  });

  it('applies custom width', () => {
    const { container } = render(<PropertyPanel title="Inspector" width={400} />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.width).toBe('400px');
  });

  it('applies correct border for position', () => {
    const { container, rerender } = render(<PropertyPanel title="Inspector" position="right" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain('border-l');
    expect(panel.className).not.toContain('border-r');

    rerender(<PropertyPanel title="Inspector" position="left" />);
    const panelLeft = container.firstElementChild as HTMLElement;
    expect(panelLeft.className).toContain('border-r');
    expect(panelLeft.className).not.toContain('border-l');
  });

  it('applies default width of 320px', () => {
    const { container } = render(<PropertyPanel title="Inspector" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.width).toBe('320px');
  });

  it('supports string width', () => {
    const { container } = render(<PropertyPanel title="Inspector" width="50%" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.width).toBe('50%');
  });

  it('renders icon in header', () => {
    render(
      <PropertyPanel
        title="Inspector"
        icon={<span data-testid="panel-icon">IC</span>}
      />,
    );
    expect(screen.getByTestId('panel-icon')).toBeInTheDocument();
  });

  it('respects defaultExpanded=false on sections', () => {
    render(
      <PropertyPanel
        sections={[
          { title: 'Collapsed Section', defaultExpanded: false, children: <div>Hidden</div> },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /collapsed section/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not show chevron when collapsible=false', () => {
    render(
      <PropertyPanel
        sections={[
          { title: 'Fixed Section', collapsible: false, children: <div>Always visible</div> },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /fixed section/i });
    // The button should not contain an SVG chevron
    const svgs = trigger.querySelectorAll('svg');
    expect(svgs.length).toBe(0);
  });

  it('applies custom className', () => {
    const { container } = render(<PropertyPanel title="Test" className="my-custom-class" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain('my-custom-class');
  });
});
