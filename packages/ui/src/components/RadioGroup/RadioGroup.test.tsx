import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Radio, RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('renders radio buttons', () => {
    render(
      <RadioGroup name="test">
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('renders labels', () => {
    render(
      <RadioGroup name="test">
        <Radio value="a" label="Option A" />
      </RadioGroup>,
    );
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });

  it('selects value on click', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup name="test" onChange={onChange}>
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>,
    );
    fireEvent.click(screen.getByLabelText('Option A'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('respects defaultValue', () => {
    render(
      <RadioGroup name="test" defaultValue="b">
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>,
    );
    expect(screen.getByLabelText('Option B')).toBeChecked();
  });

  it('controlled mode', () => {
    render(
      <RadioGroup name="test" value="a">
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>,
    );
    expect(screen.getByLabelText('Option A')).toBeChecked();
    expect(screen.getByLabelText('Option B')).not.toBeChecked();
  });

  it('renders group label', () => {
    render(
      <RadioGroup name="test" label="Pick one">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('renders error', () => {
    render(
      <RadioGroup name="test" error="Required field">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('renders description on radio item', () => {
    render(
      <RadioGroup name="test">
        <Radio value="a" label="A" description="First option" />
      </RadioGroup>,
    );
    expect(screen.getByText('First option')).toBeInTheDocument();
  });

  it('disables all radios', () => {
    render(
      <RadioGroup name="test" disabled>
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    expect(screen.getByLabelText('A')).toBeDisabled();
    expect(screen.getByLabelText('B')).toBeDisabled();
  });
});
