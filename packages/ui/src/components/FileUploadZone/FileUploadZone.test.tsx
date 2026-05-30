import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploadZone } from './FileUploadZone';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createFile(name: string, size: number, type: string): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

function fireDragEvent(element: Element, eventType: string, files: File[] = []): void {
  const event = new Event(eventType, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files,
      items: files.map((f) => ({ kind: 'file', type: f.type })),
      types: files.length > 0 ? ['Files'] : [],
    },
  });
  element.dispatchEvent(event);
}

// ─── Basic Rendering ──────────────────────────────────────────────────────────

describe('FileUploadZone -- renders', () => {
  it('renders the drop zone', () => {
    render(<FileUploadZone />);
    expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument();
    expect(screen.getByText('Drag files here or click to browse')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<FileUploadZone label="Upload files" />);
    expect(screen.getByText('Upload files')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<FileUploadZone description="PDF or images only" />);
    expect(screen.getByText('PDF or images only')).toBeInTheDocument();
  });

  it('renders custom children in drop zone', () => {
    render(
      <FileUploadZone>
        <span>Custom content</span>
      </FileUploadZone>,
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
    // Default text should not appear when children are provided
    expect(screen.queryByText('Drag files here or click to browse')).not.toBeInTheDocument();
  });
});

// ─── Click to Browse ──────────────────────────────────────────────────────────

describe('FileUploadZone -- click to browse', () => {
  it('opens file input when zone is clicked', async () => {
    const user = userEvent.setup();
    render(<FileUploadZone />);

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByTestId('file-upload-zone'));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('does not open file input when disabled', async () => {
    const user = userEvent.setup();
    render(<FileUploadZone disabled />);

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByTestId('file-upload-zone'));
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

// ─── File Selection via onChange ───────────────────────────────────────────────

describe('FileUploadZone -- file selection', () => {
  it('calls onChange with selected files', () => {
    const handleChange = vi.fn();
    render(<FileUploadZone onChange={handleChange} />);

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const file = createFile('test.txt', 100, 'text/plain');

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith([file]);
  });

  it('displays selected files with name and size', () => {
    render(<FileUploadZone />);

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const file = createFile('document.pdf', 1024, 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('shows remove button for each selected file', () => {
    render(<FileUploadZone />);

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const file = createFile('photo.jpg', 500, 'image/jpeg');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByLabelText('Remove photo.jpg')).toBeInTheDocument();
  });
});

// ─── Drag and Drop ────────────────────────────────────────────────────────────

describe('FileUploadZone -- drag and drop', () => {
  it('highlights zone on drag over', () => {
    render(<FileUploadZone />);
    const zone = screen.getByTestId('file-upload-zone');

    act(() => {
      fireDragEvent(zone, 'dragenter');
    });

    expect(zone).toHaveAttribute('data-dragging', 'true');
  });

  it('removes highlight on drag leave', () => {
    render(<FileUploadZone />);
    const zone = screen.getByTestId('file-upload-zone');

    act(() => {
      fireDragEvent(zone, 'dragenter');
    });
    expect(zone).toHaveAttribute('data-dragging', 'true');

    act(() => {
      fireDragEvent(zone, 'dragleave');
    });
    expect(zone).not.toHaveAttribute('data-dragging');
  });

  it('processes files on drop', () => {
    const handleChange = vi.fn();
    render(<FileUploadZone onChange={handleChange} />);

    const zone = screen.getByTestId('file-upload-zone');
    const file = createFile('dropped.txt', 200, 'text/plain');

    act(() => {
      fireDragEvent(zone, 'drop', [file]);
    });

    expect(handleChange).toHaveBeenCalledWith([file]);
  });

  it('does not process files when disabled and dropped', () => {
    const handleChange = vi.fn();
    render(<FileUploadZone disabled onChange={handleChange} />);

    const zone = screen.getByTestId('file-upload-zone');
    const file = createFile('dropped.txt', 200, 'text/plain');

    act(() => {
      fireDragEvent(zone, 'drop', [file]);
    });

    expect(handleChange).not.toHaveBeenCalled();
  });
});

// ─── Max Files Rejection ──────────────────────────────────────────────────────

describe('FileUploadZone -- maxFiles', () => {
  it('rejects files beyond maxFiles limit', () => {
    const handleChange = vi.fn();
    const handleReject = vi.fn();
    render(
      <FileUploadZone maxFiles={2} onChange={handleChange} onReject={handleReject} multiple />,
    );

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const files = [
      createFile('a.txt', 10, 'text/plain'),
      createFile('b.txt', 10, 'text/plain'),
      createFile('c.txt', 10, 'text/plain'),
    ];

    fireEvent.change(input, { target: { files } });

    expect(handleChange).toHaveBeenCalledWith(expect.arrayContaining([files[0], files[1]]));
    expect(handleChange.mock.calls[0][0]).toHaveLength(2);
    expect(handleReject).toHaveBeenCalledWith([{ file: files[2], reason: 'too many' }]);
  });
});

// ─── Max Size Rejection ───────────────────────────────────────────────────────

describe('FileUploadZone -- maxSize', () => {
  it('rejects files over maxSize limit', () => {
    const handleChange = vi.fn();
    const handleReject = vi.fn();
    render(
      <FileUploadZone maxSize={500} onChange={handleChange} onReject={handleReject} />,
    );

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const smallFile = createFile('small.txt', 100, 'text/plain');
    const largeFile = createFile('large.txt', 1000, 'text/plain');

    fireEvent.change(input, { target: { files: [smallFile, largeFile] } });

    expect(handleChange).toHaveBeenCalledWith([smallFile]);
    expect(handleReject).toHaveBeenCalledWith([{ file: largeFile, reason: 'too large' }]);
  });
});

// ─── Accept Filtering ─────────────────────────────────────────────────────────

describe('FileUploadZone -- accept filtering', () => {
  it('rejects files with wrong MIME type', () => {
    const handleChange = vi.fn();
    const handleReject = vi.fn();
    render(
      <FileUploadZone accept="image/*" onChange={handleChange} onReject={handleReject} />,
    );

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const imageFile = createFile('photo.jpg', 100, 'image/jpeg');
    const textFile = createFile('doc.txt', 100, 'text/plain');

    fireEvent.change(input, { target: { files: [imageFile, textFile] } });

    expect(handleChange).toHaveBeenCalledWith([imageFile]);
    expect(handleReject).toHaveBeenCalledWith([{ file: textFile, reason: 'wrong type' }]);
  });

  it('accepts files by extension', () => {
    const handleChange = vi.fn();
    render(
      <FileUploadZone accept=".pdf,.doc" onChange={handleChange} />,
    );

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const pdfFile = createFile('report.pdf', 100, 'application/pdf');

    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(handleChange).toHaveBeenCalledWith([pdfFile]);
  });

  it('displays accepted types in the zone', () => {
    render(<FileUploadZone accept="image/*,.pdf" />);
    expect(screen.getByText('Accepted: image/*,.pdf')).toBeInTheDocument();
  });
});

// ─── Disabled State ───────────────────────────────────────────────────────────

describe('FileUploadZone -- disabled', () => {
  it('applies disabled styling', () => {
    render(<FileUploadZone disabled />);
    const zone = screen.getByTestId('file-upload-zone');
    expect(zone).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the file input', () => {
    render(<FileUploadZone disabled />);
    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('does not highlight on drag when disabled', () => {
    render(<FileUploadZone disabled />);
    const zone = screen.getByTestId('file-upload-zone');

    act(() => {
      fireDragEvent(zone, 'dragenter');
    });
    expect(zone).not.toHaveAttribute('data-dragging');
  });
});

// ─── Remove File ──────────────────────────────────────────────────────────────

describe('FileUploadZone -- remove file', () => {
  it('removes a file from the list and calls onChange', () => {
    const handleChange = vi.fn();
    render(<FileUploadZone onChange={handleChange} multiple />);

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement;
    const files = [
      createFile('a.txt', 10, 'text/plain'),
      createFile('b.txt', 20, 'text/plain'),
    ];

    fireEvent.change(input, { target: { files } });

    // Both files should be listed
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();

    // Remove first file
    fireEvent.click(screen.getByLabelText('Remove a.txt'));

    expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();

    // onChange should have been called with remaining files
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
    expect(lastCall[0]).toHaveLength(1);
    expect(lastCall[0][0].name).toBe('b.txt');
  });
});

// ─── Error Display ────────────────────────────────────────────────────────────

describe('FileUploadZone -- error', () => {
  it('displays error message', () => {
    render(<FileUploadZone error="File is required" />);
    expect(screen.getByText('File is required')).toBeInTheDocument();
  });

  it('renders error with role=alert', () => {
    render(<FileUploadZone error="File is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('File is required');
  });

  it('sets aria-invalid on zone when error exists', () => {
    render(<FileUploadZone error="Required" />);
    const zone = screen.getByTestId('file-upload-zone');
    expect(zone).toHaveAttribute('aria-invalid', 'true');
  });
});

// ─── Ref Forwarding ───────────────────────────────────────────────────────────

describe('FileUploadZone -- ref forwarding', () => {
  it('forwards ref to the native file input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<FileUploadZone ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('file');
  });
});

// ─── Sizes ────────────────────────────────────────────────────────────────────

describe('FileUploadZone -- sizes', () => {
  it('renders sm size', () => {
    const { container } = render(<FileUploadZone size="sm" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders md size', () => {
    const { container } = render(<FileUploadZone size="md" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders lg size', () => {
    const { container } = render(<FileUploadZone size="lg" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
