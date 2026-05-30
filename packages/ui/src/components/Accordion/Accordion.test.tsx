import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Accordion, AccordionItem } from './Accordion';

describe('Accordion', () => {
  it('renders items', () => {
    render(
      <Accordion>
        <AccordionItem value="1" title="Item 1">Content 1</AccordionItem>
        <AccordionItem value="2" title="Item 2">Content 2</AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('expands on click', () => {
    render(
      <Accordion>
        <AccordionItem value="1" title="Item 1">Content 1</AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByText('Item 1');
    expect(trigger.closest('button')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger.closest('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses on second click', () => {
    render(
      <Accordion>
        <AccordionItem value="1" title="Item 1">Content 1</AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByText('Item 1');
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(trigger.closest('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('single mode: only one item open at a time', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="1" title="Item 1">Content 1</AccordionItem>
        <AccordionItem value="2" title="Item 2">Content 2</AccordionItem>
      </Accordion>,
    );
    fireEvent.click(screen.getByText('Item 1'));
    expect(screen.getByText('Item 1').closest('button')).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByText('Item 2'));
    expect(screen.getByText('Item 1').closest('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Item 2').closest('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('multiple mode: many items open', () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="1" title="Item 1">Content 1</AccordionItem>
        <AccordionItem value="2" title="Item 2">Content 2</AccordionItem>
      </Accordion>,
    );
    fireEvent.click(screen.getByText('Item 1'));
    fireEvent.click(screen.getByText('Item 2'));
    expect(screen.getByText('Item 1').closest('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Item 2').closest('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('respects defaultValue', () => {
    render(
      <Accordion defaultValue={['2']}>
        <AccordionItem value="1" title="Item 1">Content 1</AccordionItem>
        <AccordionItem value="2" title="Item 2">Content 2</AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText('Item 1').closest('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Item 2').closest('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('disabled item does not expand', () => {
    render(
      <Accordion>
        <AccordionItem value="1" title="Item 1" disabled>Content 1</AccordionItem>
      </Accordion>,
    );
    fireEvent.click(screen.getByText('Item 1'));
    expect(screen.getByText('Item 1').closest('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders subtitle', () => {
    render(
      <Accordion>
        <AccordionItem value="1" title="Item 1" subtitle="Sub text">Content 1</AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText('Sub text')).toBeInTheDocument();
  });

  it('has proper aria attributes', () => {
    render(
      <Accordion>
        <AccordionItem value="test" title="Test">Content</AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByText('Test').closest('button')!;
    expect(trigger).toHaveAttribute('aria-controls', 'accordion-content-test');
    expect(trigger).toHaveAttribute('id', 'accordion-trigger-test');
  });
});
