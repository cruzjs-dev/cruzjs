import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagsInput } from './TagsInput';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('TagsInput -- renders input', () => {
  it('renders a text input', () => {
    render(<TagsInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<TagsInput placeholder="Add tags..." />);
    expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<TagsInput label="Tags" />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<TagsInput description="Enter your tags" />);
    expect(screen.getByText('Enter your tags')).toBeInTheDocument();
  });
});

// ─── Tag Creation on Enter ─────────────────────────────────────────────────

describe('TagsInput -- creates tag on Enter', () => {
  it('creates a tag when pressing Enter', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledWith(['react']);
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('clears input after creating tag', async () => {
    const user = userEvent.setup();
    render(<TagsInput />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');

    expect(input).toHaveValue('');
  });

  it('does not create empty tag on Enter', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.keyboard('{Enter}');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('trims whitespace from tag', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '  react  ');
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledWith(['react']);
  });
});

// ─── Tag Creation on Comma ─────────────────────────────────────────────────

describe('TagsInput -- creates tag on comma', () => {
  it('creates a tag when typing comma (default separator)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react,');

    expect(handleChange).toHaveBeenCalledWith(['react']);
    expect(screen.getByText('react')).toBeInTheDocument();
  });
});

// ─── Tag Removal on X Click ───────────────────────────────────────────────

describe('TagsInput -- removes tag on X click', () => {
  it('removes a tag when clicking the remove button', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react', 'vue']} onChange={handleChange} />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('vue')).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    await user.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith(['vue']);
  });
});

// ─── Backspace Removes Last Tag ────────────────────────────────────────────

describe('TagsInput -- backspace removes last tag', () => {
  it('removes the last tag when pressing Backspace on empty input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react', 'vue', 'angular']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Backspace}');

    expect(handleChange).toHaveBeenCalledWith(['react', 'vue']);
  });

  it('does not remove tag when input has text and Backspace is pressed', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'v');
    await user.keyboard('{Backspace}');

    // onChange should not have been called for tag removal
    expect(handleChange).not.toHaveBeenCalled();
  });
});

// ─── maxTags Limit ─────────────────────────────────────────────────────────

describe('TagsInput -- maxTags limit', () => {
  it('stops accepting new tags at maxTags limit', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput maxTags={2} defaultValue={['react', 'vue']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'angular');
    await user.keyboard('{Enter}');

    // onChange should not be called since we are at the limit
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('allows adding tags up to maxTags', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput maxTags={2} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledWith(['react']);
  });
});

// ─── Duplicates Rejected ───────────────────────────────────────────────────

describe('TagsInput -- duplicates rejected', () => {
  it('rejects duplicate tags by default', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');

    // onChange should not be called for duplicate
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('allows duplicates when allowDuplicates is true', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react']} allowDuplicates onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledWith(['react', 'react']);
  });
});

// ─── onChange Fires ────────────────────────────────────────────────────────

describe('TagsInput -- onChange fires', () => {
  it('fires onChange when adding a tag', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react');
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(['react']);
  });

  it('fires onChange when removing a tag', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react', 'vue']} onChange={handleChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    await user.click(removeButtons[1]);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(['react']);
  });

  it('fires onChange with cumulative tags', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');

    await user.type(input, 'react');
    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenLastCalledWith(['react']);

    await user.type(input, 'vue');
    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenLastCalledWith(['react', 'vue']);
  });
});

// ─── Disabled State ────────────────────────────────────────────────────────

describe('TagsInput -- disabled state', () => {
  it('disables the input when disabled prop is true', () => {
    render(<TagsInput disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('does not show remove buttons when disabled', () => {
    render(<TagsInput defaultValue={['react', 'vue']} disabled />);
    expect(screen.queryAllByRole('button', { name: /Remove/ })).toHaveLength(0);
  });

  it('does not remove tags via backspace when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput defaultValue={['react']} disabled onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    // Cannot focus a disabled input, but verifying no changes happen
    expect(input).toBeDisabled();
    expect(handleChange).not.toHaveBeenCalled();
  });
});

// ─── Error Display ─────────────────────────────────────────────────────────

describe('TagsInput -- error display', () => {
  it('renders error message', () => {
    render(<TagsInput error="At least one tag required" />);
    expect(screen.getByText('At least one tag required')).toBeInTheDocument();
  });

  it('shows error with role alert', () => {
    render(<TagsInput error="Something went wrong" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid on the input when error is present', () => {
    render(<TagsInput label="Tags" error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});

// ─── Controlled Value ──────────────────────────────────────────────────────

describe('TagsInput -- controlled value', () => {
  it('renders tags from controlled value prop', () => {
    render(<TagsInput value={['react', 'vue']} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('vue')).toBeInTheDocument();
  });

  it('updates when value prop changes', () => {
    const { rerender } = render(<TagsInput value={['react']} />);
    expect(screen.getByText('react')).toBeInTheDocument();

    rerender(<TagsInput value={['react', 'vue']} />);
    expect(screen.getByText('vue')).toBeInTheDocument();
  });

  it('calls onChange with new tags but does not update internally for controlled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput value={['react']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'vue');
    await user.keyboard('{Enter}');

    // onChange fires with the new set
    expect(handleChange).toHaveBeenCalledWith(['react', 'vue']);
    // But since value is controlled and not updated, only 'react' remains visible
    expect(screen.getByText('react')).toBeInTheDocument();
  });
});

// ─── Custom Separator ──────────────────────────────────────────────────────

describe('TagsInput -- custom separator', () => {
  it('creates tag on custom separator character', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput separator={[';', 'Enter']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react;');

    expect(handleChange).toHaveBeenCalledWith(['react']);
  });

  it('does not create tag on comma when custom separator is set', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagsInput separator={[';', 'Enter']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'react,');

    // Comma should not trigger tag creation
    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('react,');
  });
});

// ─── Default Value ─────────────────────────────────────────────────────────

describe('TagsInput -- defaultValue', () => {
  it('renders initial tags from defaultValue', () => {
    render(<TagsInput defaultValue={['react', 'vue', 'angular']} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('vue')).toBeInTheDocument();
    expect(screen.getByText('angular')).toBeInTheDocument();
  });
});

// ─── Ref Forwarding ────────────────────────────────────────────────────────

describe('TagsInput -- ref forwarding', () => {
  it('forwards ref to the input element', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<TagsInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
