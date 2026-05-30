import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Splitter } from './Splitter';

describe('Splitter', () => {
  it('renders two panes', () => {
    render(
      <Splitter>
        <div>Pane A</div>
        <div>Pane B</div>
      </Splitter>,
    );
    expect(screen.getByText('Pane A')).toBeInTheDocument();
    expect(screen.getByText('Pane B')).toBeInTheDocument();
  });

  it('renders a divider with separator role', () => {
    render(
      <Splitter>
        <div>Left</div>
        <div>Right</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has correct default aria-valuenow of 50', () => {
    render(
      <Splitter>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '50');
  });

  it('applies custom defaultSize to aria-valuenow', () => {
    render(
      <Splitter defaultSize={30}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '30');
  });

  it('clamps defaultSize to minSize', () => {
    render(
      <Splitter defaultSize={5} minSize={20}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '20');
  });

  it('clamps defaultSize to maxSize', () => {
    render(
      <Splitter defaultSize={95} maxSize={80}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '80');
  });

  it('horizontal orientation: ArrowLeft decreases size', () => {
    const onResize = vi.fn();
    render(
      <Splitter defaultSize={50} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenCalledWith(49);
    expect(divider).toHaveAttribute('aria-valuenow', '49');
  });

  it('horizontal orientation: ArrowRight increases size', () => {
    const onResize = vi.fn();
    render(
      <Splitter defaultSize={50} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith(51);
    expect(divider).toHaveAttribute('aria-valuenow', '51');
  });

  it('vertical orientation: ArrowUp decreases size', () => {
    const onResize = vi.fn();
    render(
      <Splitter orientation="vertical" defaultSize={50} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowUp' });
    expect(onResize).toHaveBeenCalledWith(49);
  });

  it('vertical orientation: ArrowDown increases size', () => {
    const onResize = vi.fn();
    render(
      <Splitter orientation="vertical" defaultSize={50} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowDown' });
    expect(onResize).toHaveBeenCalledWith(51);
  });

  it('keyboard does not exceed maxSize', () => {
    const onResize = vi.fn();
    render(
      <Splitter defaultSize={90} maxSize={90} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith(90);
  });

  it('keyboard does not go below minSize', () => {
    const onResize = vi.fn();
    render(
      <Splitter defaultSize={10} minSize={10} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenCalledWith(10);
  });

  it('disabled prevents keyboard interaction', () => {
    const onResize = vi.fn();
    render(
      <Splitter disabled defaultSize={50} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.keyDown(divider, { key: 'ArrowRight' });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('disabled sets tabIndex to -1', () => {
    render(
      <Splitter disabled>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('tabindex', '-1');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Splitter className="my-custom-class">
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });

  it('collapsible double-click toggles first pane to 0%', () => {
    const onResize = vi.fn();
    render(
      <Splitter collapsible defaultSize={40} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');

    // First double-click collapses
    fireEvent.doubleClick(divider);
    expect(onResize).toHaveBeenCalledWith(0);
    expect(divider).toHaveAttribute('aria-valuenow', '0');

    // Second double-click restores
    fireEvent.doubleClick(divider);
    expect(onResize).toHaveBeenCalledWith(40);
    expect(divider).toHaveAttribute('aria-valuenow', '40');
  });

  it('double-click does nothing when collapsible is false', () => {
    const onResize = vi.fn();
    render(
      <Splitter defaultSize={40} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.doubleClick(divider);
    expect(onResize).not.toHaveBeenCalled();
  });

  it('double-click does nothing when disabled', () => {
    const onResize = vi.fn();
    render(
      <Splitter collapsible disabled defaultSize={40} onResize={onResize}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const divider = screen.getByRole('separator');
    fireEvent.doubleClick(divider);
    expect(onResize).not.toHaveBeenCalled();
  });

  it('sets aria-orientation matching orientation prop', () => {
    const { rerender } = render(
      <Splitter orientation="horizontal">
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');

    rerender(
      <Splitter orientation="vertical">
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('first pane uses flex-basis matching the size', () => {
    render(
      <Splitter defaultSize={35}>
        <div>A</div>
        <div>B</div>
      </Splitter>,
    );
    const pane0 = screen.getByTestId('splitter-pane-0');
    expect(pane0.style.flexBasis).toBe('35%');
  });
});
