import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  it('renders editor with contenteditable', () => {
    render(<RichTextEditor />);
    const editor = screen.getByRole('textbox');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('contenteditable', 'true');
  });

  it('renders toolbar buttons with default toolbar', () => {
    render(<RichTextEditor />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeInTheDocument();
    // Default toolbar has 9 buttons
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Underline')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordered list')).toBeInTheDocument();
    expect(screen.getByLabelText('Link')).toBeInTheDocument();
    expect(screen.getByLabelText('Blockquote')).toBeInTheDocument();
    expect(screen.getByLabelText('Code')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<RichTextEditor label="Content" />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<RichTextEditor label="Body" description="Write your content here" />);
    expect(screen.getByText('Write your content here')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<RichTextEditor label="Content" error="Content is required" />);
    expect(screen.getByText('Content is required')).toBeInTheDocument();
  });

  it('sets aria-invalid on error', () => {
    render(<RichTextEditor error="Required" />);
    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when no error', () => {
    render(<RichTextEditor />);
    const editor = screen.getByRole('textbox');
    expect(editor).not.toHaveAttribute('aria-invalid');
  });

  it('applies disabled state with contenteditable=false', () => {
    render(<RichTextEditor disabled />);
    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('contenteditable', 'false');
  });

  it('disables toolbar buttons when disabled', () => {
    render(<RichTextEditor disabled />);
    const boldButton = screen.getByLabelText('Bold');
    expect(boldButton).toBeDisabled();
  });

  it('shows placeholder via data attribute when empty', () => {
    render(<RichTextEditor placeholder="Start typing..." />);
    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('data-placeholder', 'Start typing...');
  });

  it('forwards className', () => {
    const { container } = render(<RichTextEditor className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('renders defaultValue as HTML content', () => {
    render(<RichTextEditor defaultValue="<p>Hello <strong>world</strong></p>" />);
    const editor = screen.getByRole('textbox');
    expect(editor.innerHTML).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('customizes toolbar with subset of buttons', () => {
    render(<RichTextEditor toolbar={['bold', 'italic']} />);
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.queryByLabelText('Underline')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Heading')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Link')).not.toBeInTheDocument();
  });

  it('renders all toolbar actions when fully specified', () => {
    render(
      <RichTextEditor
        toolbar={['bold', 'italic', 'underline', 'strikethrough', 'heading', 'bulletList', 'orderedList', 'link', 'code', 'blockquote']}
      />,
    );
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Underline')).toBeInTheDocument();
    expect(screen.getByLabelText('Strikethrough')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordered list')).toBeInTheDocument();
    expect(screen.getByLabelText('Link')).toBeInTheDocument();
    expect(screen.getByLabelText('Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Blockquote')).toBeInTheDocument();
  });

  it('applies size styles', () => {
    const { rerender } = render(<RichTextEditor size="sm" />);
    let editor = screen.getByRole('textbox');
    expect(editor.className).toContain('text-xs');

    rerender(<RichTextEditor size="md" />);
    editor = screen.getByRole('textbox');
    expect(editor.className).toContain('text-sm');

    rerender(<RichTextEditor size="lg" />);
    editor = screen.getByRole('textbox');
    expect(editor.className).toContain('text-base');
  });

  it('applies minHeight and maxHeight styles', () => {
    render(<RichTextEditor minHeight="200px" maxHeight="400px" />);
    const editor = screen.getByRole('textbox');
    expect(editor.style.minHeight).toBe('200px');
    expect(editor.style.maxHeight).toBe('400px');
  });

  it('fires onChange on input', () => {
    const handleChange = vi.fn();
    render(<RichTextEditor onChange={handleChange} />);
    const editor = screen.getByRole('textbox');
    editor.innerHTML = '<p>hello</p>';
    fireEvent.input(editor);
    expect(handleChange).toHaveBeenCalledWith('<p>hello</p>');
  });

  it('has aria-multiline on editor', () => {
    render(<RichTextEditor />);
    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('aria-multiline', 'true');
  });

  it('toolbar buttons have aria-pressed attribute', () => {
    render(<RichTextEditor />);
    const boldButton = screen.getByLabelText('Bold');
    expect(boldButton).toHaveAttribute('aria-pressed');
  });

  it('applies w-full to root wrapper', () => {
    const { container } = render(<RichTextEditor />);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('renders label with htmlFor pointing to editor id', () => {
    render(<RichTextEditor label="Editor" />);
    const label = screen.getByText('Editor');
    const editor = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', editor.id);
  });

  it('sets aria-describedby when error present', () => {
    render(<RichTextEditor label="Content" error="Required" />);
    const editor = screen.getByRole('textbox');
    const errorId = editor.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    const errorEl = document.getElementById(errorId!);
    expect(errorEl).toHaveTextContent('Required');
  });
});
