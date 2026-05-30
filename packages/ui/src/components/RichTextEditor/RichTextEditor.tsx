import React, { forwardRef, useRef, useCallback, useState, useEffect } from 'react';

export type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'link'
  | 'code'
  | 'blockquote';

export type RichTextEditorSize = 'sm' | 'md' | 'lg';

export type RichTextEditorProps = {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  toolbar?: ToolbarAction[];
  size?: RichTextEditorSize;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  className?: string;
};

const DEFAULT_TOOLBAR: ToolbarAction[] = [
  'bold',
  'italic',
  'underline',
  'heading',
  'bulletList',
  'orderedList',
  'link',
  'blockquote',
  'code',
];

const sizeStyles: Record<RichTextEditorSize, { toolbar: string; editor: string; label: string; button: string }> = {
  sm: {
    toolbar: 'px-2 py-1 gap-0.5',
    editor: 'px-3 py-2 text-xs',
    label: 'text-xs',
    button: 'w-6 h-6 text-xs',
  },
  md: {
    toolbar: 'px-2.5 py-1.5 gap-1',
    editor: 'px-3.5 py-2.5 text-sm',
    label: 'text-sm',
    button: 'w-7 h-7 text-sm',
  },
  lg: {
    toolbar: 'px-3 py-2 gap-1',
    editor: 'px-4 py-3 text-base',
    label: 'text-sm',
    button: 'w-8 h-8 text-base',
  },
};

type ToolbarButtonConfig = {
  action: ToolbarAction;
  label: string;
  icon: string;
};

const TOOLBAR_BUTTONS: ToolbarButtonConfig[] = [
  { action: 'bold', label: 'Bold', icon: 'B' },
  { action: 'italic', label: 'Italic', icon: 'I' },
  { action: 'underline', label: 'Underline', icon: 'U' },
  { action: 'strikethrough', label: 'Strikethrough', icon: 'S' },
  { action: 'heading', label: 'Heading', icon: 'H' },
  { action: 'bulletList', label: 'Bullet list', icon: '•' },
  { action: 'orderedList', label: 'Ordered list', icon: '1.' },
  { action: 'link', label: 'Link', icon: '🔗' },
  { action: 'code', label: 'Code', icon: '</>' },
  { action: 'blockquote', label: 'Blockquote', icon: '“' },
];

function queryCommandState(command: string): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function isInsideTag(tagName: string): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }
  let node: Node | null = selection.anchorNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === tagName.toUpperCase()) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function getActiveStates(): Record<ToolbarAction, boolean> {
  return {
    bold: queryCommandState('bold'),
    italic: queryCommandState('italic'),
    underline: queryCommandState('underline'),
    strikethrough: queryCommandState('strikeThrough'),
    heading: isInsideTag('H2'),
    bulletList: queryCommandState('insertUnorderedList'),
    orderedList: queryCommandState('insertOrderedList'),
    link: isInsideTag('A'),
    code: isInsideTag('CODE'),
    blockquote: isInsideTag('BLOCKQUOTE'),
  };
}

export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(function RichTextEditor(
  {
    label,
    description,
    error,
    value,
    defaultValue,
    onChange,
    placeholder,
    toolbar = DEFAULT_TOOLBAR,
    size = 'md',
    minHeight,
    maxHeight,
    disabled = false,
    className,
  },
  ref,
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [activeStates, setActiveStates] = useState<Record<ToolbarAction, boolean>>(() => ({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    link: false,
    code: false,
    blockquote: false,
  }));

  const s = sizeStyles[size];
  const editorId = label ? `rte-${Math.random().toString(36).slice(2, 9)}` : undefined;
  const hasError = !!error;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      editorRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref],
  );

  // Set initial content from defaultValue
  useEffect(() => {
    const el = editorRef.current;
    if (el && defaultValue !== undefined && !value) {
      el.innerHTML = defaultValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync controlled value
  useEffect(() => {
    const el = editorRef.current;
    if (el && value !== undefined && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const updateActiveStates = useCallback(() => {
    setActiveStates(getActiveStates());
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (el && onChange) {
      onChange(el.innerHTML);
    }
    updateActiveStates();
  }, [onChange, updateActiveStates]);

  const handleKeyUp = useCallback(() => {
    updateActiveStates();
  }, [updateActiveStates]);

  const handleMouseUp = useCallback(() => {
    updateActiveStates();
  }, [updateActiveStates]);

  const execCommand = useCallback((command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    const el = editorRef.current;
    if (el) {
      // Trigger change callback after command
      handleInput();
    }
  }, [handleInput]);

  const handleToolbarAction = useCallback((action: ToolbarAction) => {
    if (disabled) {
      return;
    }

    switch (action) {
      case 'bold':
        execCommand('bold');
        break;
      case 'italic':
        execCommand('italic');
        break;
      case 'underline':
        execCommand('underline');
        break;
      case 'strikethrough':
        execCommand('strikeThrough');
        break;
      case 'heading':
        if (isInsideTag('H2')) {
          execCommand('formatBlock', 'p');
        } else {
          execCommand('formatBlock', 'h2');
        }
        break;
      case 'bulletList':
        execCommand('insertUnorderedList');
        break;
      case 'orderedList':
        execCommand('insertOrderedList');
        break;
      case 'link': {
        if (isInsideTag('A')) {
          execCommand('unlink');
        } else {
          const url = window.prompt('Enter URL:');
          if (url) {
            execCommand('createLink', url);
          }
        }
        break;
      }
      case 'code': {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          if (isInsideTag('CODE')) {
            // Remove code wrapping - find the code element and unwrap it
            let node: Node | null = selection.anchorNode;
            while (node) {
              if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'CODE') {
                const parent = node.parentNode;
                if (parent) {
                  while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                  }
                  parent.removeChild(node);
                }
                break;
              }
              node = node.parentNode;
            }
          } else {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            if (selectedText) {
              const code = document.createElement('code');
              range.surroundContents(code);
            }
          }
          editorRef.current?.focus();
          handleInput();
        }
        break;
      }
      case 'blockquote':
        if (isInsideTag('BLOCKQUOTE')) {
          execCommand('formatBlock', 'p');
        } else {
          execCommand('formatBlock', 'blockquote');
        }
        break;
    }

    updateActiveStates();
  }, [disabled, execCommand, handleInput, updateActiveStates]);

  const toolbarButtons = TOOLBAR_BUTTONS.filter((btn) => toolbar.includes(btn.action));

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={editorId}
          className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}
        >
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
      )}
      <div
        className={[
          'border rounded-xl overflow-hidden transition-all duration-200',
          hasError
            ? 'border-danger'
            : focused
              ? 'border-primary ring-2 ring-primary/50'
              : 'border-input-border',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].filter(Boolean).join(' ')}
      >
        {/* Toolbar */}
        <div
          className={[
            'flex flex-wrap items-center border-b border-input-border bg-surface-lighter',
            s.toolbar,
          ].join(' ')}
          role="toolbar"
          aria-label="Text formatting"
        >
          {toolbarButtons.map((btn) => (
            <button
              key={btn.action}
              type="button"
              title={btn.label}
              aria-label={btn.label}
              aria-pressed={activeStates[btn.action]}
              disabled={disabled}
              onMouseDown={(e) => {
                // Prevent focus from leaving the editor
                e.preventDefault();
                handleToolbarAction(btn.action);
              }}
              className={[
                'inline-flex items-center justify-center rounded-md transition-colors duration-150',
                s.button,
                activeStates[btn.action]
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                disabled ? 'pointer-events-none' : 'cursor-pointer',
                btn.action === 'bold' ? 'font-bold' : '',
                btn.action === 'italic' ? 'italic' : '',
                btn.action === 'underline' ? 'underline' : '',
                btn.action === 'strikethrough' ? 'line-through' : '',
              ].filter(Boolean).join(' ')}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div
          ref={setRefs}
          id={editorId}
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${editorId}-error` : undefined}
          aria-placeholder={placeholder}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={[
            'w-full bg-surface text-text outline-none',
            s.editor,
            'prose prose-sm max-w-none',
            '[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-text-muted [&:empty]:before:pointer-events-none',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary',
            '[&_code]:bg-surface-lighter [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary [&_code]:text-[0.875em]',
            '[&_a]:text-primary [&_a]:underline',
            '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text [&_h2]:mt-4 [&_h2]:mb-2',
            '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_li]:mb-1',
          ].join(' ')}
          style={{
            minHeight: minHeight ?? (size === 'sm' ? '80px' : size === 'lg' ? '160px' : '120px'),
            maxHeight: maxHeight ?? undefined,
            overflowY: maxHeight ? 'auto' : undefined,
          }}
        />
      </div>
      {error && (
        <p id={`${editorId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
