import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Marquee } from './Marquee';

describe('Marquee', () => {
  it('renders children content', () => {
    render(<Marquee>Hello World</Marquee>);
    const elements = screen.getAllByText('Hello World');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('duplicates content for seamless loop', () => {
    render(<Marquee>Loop Content</Marquee>);
    const contents = screen.getAllByText('Loop Content');
    expect(contents.length).toBe(2);
  });

  it('marks the duplicate as aria-hidden', () => {
    render(<Marquee>Accessible</Marquee>);
    const duplicate = screen.getByTestId('marquee-content-duplicate');
    expect(duplicate).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies pauseOnHover class when enabled', () => {
    render(<Marquee pauseOnHover>Hover me</Marquee>);
    const track = screen.getByTestId('marquee-track');
    expect(track.className).toContain('marquee-pause-on-hover');
  });

  it('does not apply pauseOnHover class when disabled', () => {
    render(<Marquee>No hover</Marquee>);
    const track = screen.getByTestId('marquee-track');
    expect(track.className).not.toContain('marquee-pause-on-hover');
  });

  it('sets direction data attribute', () => {
    render(<Marquee direction="right">RTL</Marquee>);
    const track = screen.getByTestId('marquee-track');
    expect(track).toHaveAttribute('data-direction', 'right');
  });

  it('defaults to left direction', () => {
    render(<Marquee>Default</Marquee>);
    const track = screen.getByTestId('marquee-track');
    expect(track).toHaveAttribute('data-direction', 'left');
  });

  it('applies custom className', () => {
    render(<Marquee className="custom-class">Content</Marquee>);
    const marquee = screen.getByTestId('marquee');
    expect(marquee.className).toContain('custom-class');
  });

  it('applies custom gap', () => {
    render(<Marquee gap={20}>Content</Marquee>);
    const content = screen.getByTestId('marquee-content');
    expect(content.style.gap).toBe('20px');
  });
});
