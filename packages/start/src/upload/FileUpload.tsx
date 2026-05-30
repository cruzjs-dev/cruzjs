import { useRef, useState } from 'react';
import { useFileUpload } from './useFileUpload';

type FileUploadProps = {
  /** Obtain a presigned PUT URL and storage key from the backend. */
  getUploadUrl: (fileName: string, contentType: string) => Promise<{ url: string; key: string }>;
  /** Called after the file has been successfully uploaded. */
  onUploadComplete: (result: { key: string; url: string; fileName: string; size: number }) => void;
  /** Called when an error occurs during upload. */
  onError?: (error: Error) => void;
  /** Comma-separated list of accepted MIME types or extensions (e.g. "image/*,.pdf"). */
  accept?: string;
  /** Maximum file size in bytes. Files exceeding this will be rejected client-side. */
  maxSize?: number;
  /** Label shown on the upload button. Defaults to "Choose File". */
  label?: string;
  /** Allow selecting multiple files. Each file is uploaded independently. */
  multiple?: boolean;
};

/**
 * File upload component with progress tracking.
 *
 * Wraps `useFileUpload` and renders a file input button, a progress bar
 * while uploading, an error alert on failure, and a success message
 * when complete.
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  getUploadUrl,
  onUploadComplete,
  onError,
  accept,
  maxSize,
  label = 'Choose File',
  multiple = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const { upload, progress, isUploading, error, reset } = useFileUpload({
    getUploadUrl,
    onUploadComplete: (result) => {
      setUploadedFileName(result.fileName);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete(result);
    },
    onError,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setUploadedFileName(null);
    reset();

    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Client-side size validation
    if (maxSize && file.size > maxSize) {
      const maxMB = (maxSize / 1024 / 1024).toFixed(1);
      setValidationError(`File size exceeds the ${maxMB} MB limit.`);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }
    await upload(selectedFile);
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
    setValidationError(null);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayError = validationError ?? error?.message ?? null;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload-input"
      />

      {/* Select + Upload buttons */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="file-upload-input"
          className={`cursor-pointer rounded-lg border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors ${
            isUploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {label}
        </label>

        {selectedFile && !isUploading && (
          <button
            type="button"
            onClick={handleUpload}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
          >
            Upload
          </button>
        )}

        {(selectedFile || uploadedFileName || displayError) && !isUploading && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-text-muted hover:text-text-strong hover:bg-surface-light transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Selected file name */}
      {selectedFile && !isUploading && (
        <p className="text-sm text-text-muted">
          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </p>
      )}

      {/* Progress bar */}
      {isUploading && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {progress}% uploaded
          </p>
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700">{displayError}</p>
        </div>
      )}

      {/* Success message */}
      {uploadedFileName && !displayError && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <svg className="h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-700">{uploadedFileName} uploaded successfully.</p>
        </div>
      )}
    </div>
  );
};
