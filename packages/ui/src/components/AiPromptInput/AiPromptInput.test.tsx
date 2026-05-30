import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiPromptInput } from './AiPromptInput';

// Mock useIsMobile to return false by default
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

describe('AiPromptInput', () => {
  it('renders textarea', () => {
    render(<AiPromptInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<AiPromptInput placeholder="Type a message..." />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('fires onChange when typing', () => {
    const onChange = vi.fn();
    render(<AiPromptInput onChange={onChange} placeholder="test" />);
    fireEvent.change(screen.getByPlaceholderText('test'), {
      target: { value: 'hello' },
    });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('submits on Enter when not empty', () => {
    const onSubmit = vi.fn();
    render(<AiPromptInput value="hello world" onSubmit={onSubmit} placeholder="test" />);
    fireEvent.keyDown(screen.getByPlaceholderText('test'), {
      key: 'Enter',
      code: 'Enter',
    });
    expect(onSubmit).toHaveBeenCalledWith('hello world');
  });

  it('does not submit on Enter when empty', () => {
    const onSubmit = vi.fn();
    render(<AiPromptInput value="" onSubmit={onSubmit} placeholder="test" />);
    fireEvent.keyDown(screen.getByPlaceholderText('test'), {
      key: 'Enter',
      code: 'Enter',
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('inserts newline on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(<AiPromptInput value="hello" onSubmit={onSubmit} placeholder="test" />);
    fireEvent.keyDown(screen.getByPlaceholderText('test'), {
      key: 'Enter',
      code: 'Enter',
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables send button when empty', () => {
    render(<AiPromptInput value="" />);
    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when loading', () => {
    render(<AiPromptInput value="hello" loading />);
    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();
  });

  it('shows loading indicator when loading', () => {
    render(<AiPromptInput loading />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows attach button when onAttach is provided', () => {
    const onAttach = vi.fn();
    render(<AiPromptInput onAttach={onAttach} />);
    const attachButton = screen.getByRole('button', { name: 'Attach file' });
    expect(attachButton).toBeInTheDocument();
    fireEvent.click(attachButton);
    expect(onAttach).toHaveBeenCalled();
  });

  it('does not show attach button when onAttach is not provided', () => {
    render(<AiPromptInput />);
    expect(screen.queryByRole('button', { name: 'Attach file' })).not.toBeInTheDocument();
  });

  it('applies disabled state', () => {
    render(<AiPromptInput disabled placeholder="test" />);
    expect(screen.getByPlaceholderText('test')).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(<AiPromptInput className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('submits via send button click', () => {
    const onSubmit = vi.fn();
    render(<AiPromptInput value="test message" onSubmit={onSubmit} />);
    const sendButton = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(sendButton);
    expect(onSubmit).toHaveBeenCalledWith('test message');
  });

  it('renders custom actions', () => {
    render(<AiPromptInput actions={<button type="button">Custom</button>} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('works as uncontrolled with defaultValue', () => {
    const onSubmit = vi.fn();
    render(
      <AiPromptInput defaultValue="initial" onSubmit={onSubmit} placeholder="test" />,
    );
    const textarea = screen.getByPlaceholderText('test');
    expect(textarea).toHaveValue('initial');

    // Submit with default value
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('initial');
  });
});
