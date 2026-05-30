import React, { forwardRef, useCallback, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileUploadZoneSize = 'sm' | 'md' | 'lg';

export type FileRejection = {
  file: File;
  reason: string;
};

export type FileUploadZoneProps = {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  onChange?: (files: File[]) => void;
  onReject?: (files: FileRejection[]) => void;
  children?: React.ReactNode;
  className?: string;
  size?: FileUploadZoneSize;
};

// ─── Size Tokens ──────────────────────────────────────────────────────────────

const sizeStyles: Record<FileUploadZoneSize, { zone: string; label: string; text: string; icon: string; fileItem: string }> = {
  sm: {
    zone: 'px-4 py-6 rounded-lg',
    label: 'text-xs',
    text: 'text-xs',
    icon: 'w-8 h-8',
    fileItem: 'text-xs py-1.5 px-2.5',
  },
  md: {
    zone: 'px-6 py-8 rounded-xl',
    label: 'text-sm',
    text: 'text-sm',
    icon: 'w-10 h-10',
    fileItem: 'text-sm py-2 px-3',
  },
  lg: {
    zone: 'px-8 py-10 rounded-xl',
    label: 'text-sm',
    text: 'text-base',
    icon: 'w-12 h-12',
    fileItem: 'text-sm py-2.5 px-3.5',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function parseAccept(accept: string): { mimeTypes: string[]; extensions: string[] } {
  const parts = accept.split(',').map((s) => s.trim()).filter(Boolean);
  const mimeTypes: string[] = [];
  const extensions: string[] = [];

  for (const part of parts) {
    if (part.startsWith('.')) {
      extensions.push(part.toLowerCase());
    } else {
      mimeTypes.push(part.toLowerCase());
    }
  }

  return { mimeTypes, extensions };
}

function matchesMimeType(fileType: string, pattern: string): boolean {
  if (pattern === '*/*') {
    return true;
  }
  const normalized = fileType.toLowerCase();
  if (pattern.endsWith('/*')) {
    const category = pattern.slice(0, -2);
    return normalized.startsWith(category + '/');
  }
  return normalized === pattern;
}

function isFileAccepted(file: File, accept: string): boolean {
  const { mimeTypes, extensions } = parseAccept(accept);

  // Check extension match
  const fileName = file.name.toLowerCase();
  for (const ext of extensions) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }

  // Check MIME type match
  if (file.type) {
    for (const mime of mimeTypes) {
      if (matchesMimeType(file.type, mime)) {
        return true;
      }
    }
  }

  return mimeTypes.length === 0 && extensions.length === 0;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RemoveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const FileUploadZone = forwardRef<HTMLInputElement, FileUploadZoneProps>(function FileUploadZone(
  {
    label,
    description,
    error,
    accept,
    multiple = false,
    maxFiles,
    maxSize,
    disabled = false,
    onChange,
    onReject,
    children,
    className,
    size = 'md',
  },
  forwardedRef,
) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const s = sizeStyles[size];
  const hasError = !!error;

  const generatedId = React.useId();
  const inputId = `file-upload-${generatedId}`;
  const errorId = error ? `${inputId}-error` : undefined;

  // Merge refs
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      (internalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [forwardedRef],
  );

  const processFiles = useCallback(
    (incoming: File[]) => {
      const accepted: File[] = [];
      const rejected: FileRejection[] = [];

      for (const file of incoming) {
        // Check accept filter
        if (accept && !isFileAccepted(file, accept)) {
          rejected.push({ file, reason: 'wrong type' });
          continue;
        }

        // Check max size
        if (maxSize && file.size > maxSize) {
          rejected.push({ file, reason: 'too large' });
          continue;
        }

        accepted.push(file);
      }

      // Check max files
      if (maxFiles && accepted.length > maxFiles) {
        const overflow = accepted.splice(maxFiles);
        for (const file of overflow) {
          rejected.push({ file, reason: 'too many' });
        }
      }

      if (rejected.length > 0 && onReject) {
        onReject(rejected);
      }

      setSelectedFiles(accepted);

      if (onChange) {
        onChange(accepted);
      }
    },
    [accept, maxFiles, maxSize, onChange, onReject],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) {
        return;
      }
      processFiles(Array.from(files));
      // Reset input so selecting the same file again triggers onChange
      event.target.value = '';
    },
    [processFiles],
  );

  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }
    internalInputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        internalInputRef.current?.click();
      }
    },
    [disabled],
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      if (disabled) {
        return;
      }

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles],
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      setSelectedFiles((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (onChange) {
          onChange(next);
        }
        return next;
      });
    },
    [onChange],
  );

  // ─── Zone classes ─────────────────────────────────────────────────────

  const zoneClasses = [
    'relative flex flex-col items-center justify-center border-2 border-dashed transition-all duration-200 cursor-pointer select-none',
    s.zone,
    isDragOver && !disabled
      ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]'
      : hasError
        ? 'border-danger bg-surface hover:border-danger'
        : 'border-input-border bg-surface hover:border-text-muted',
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'hover:bg-surface-lighter',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}
        >
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={setRef}
        type="file"
        id={inputId}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-describedby={errorId}
        data-testid="file-upload-input"
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={zoneClasses}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        aria-label="File upload drop zone"
        aria-disabled={disabled || undefined}
        aria-invalid={hasError || undefined}
        data-testid="file-upload-zone"
        data-dragging={isDragOver || undefined}
      >
        {children ?? (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <UploadIcon
              className={[
                s.icon,
                'transition-colors duration-200',
                isDragOver && !disabled ? 'text-primary' : 'text-text-muted',
              ].join(' ')}
            />
            <div className="text-center">
              <p className={['font-medium text-text', s.text].join(' ')}>
                Drag files here or click to browse
              </p>
              {accept && (
                <p className="text-xs text-text-tertiary mt-1">
                  Accepted: {accept}
                </p>
              )}
              {maxSize && (
                <p className="text-xs text-text-tertiary mt-0.5">
                  Max size: {formatFileSize(maxSize)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <ul className="mt-2 space-y-1" role="list" aria-label="Selected files">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className={[
                'flex items-center justify-between gap-2 bg-surface-lighter border border-input-border rounded-lg',
                s.fileItem,
              ].join(' ')}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="w-4 h-4 shrink-0 text-text-muted" />
                <span className="truncate text-text font-medium">{file.name}</span>
                <span className="shrink-0 text-text-tertiary">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
                className="shrink-0 p-0.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors duration-150"
                aria-label={`Remove ${file.name}`}
              >
                <RemoveIcon className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

FileUploadZone.displayName = 'FileUploadZone';
