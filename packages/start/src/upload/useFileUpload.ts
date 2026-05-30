import { useCallback, useRef, useState } from 'react';

type UploadResult = {
  key: string;
  url: string;
  fileName: string;
  size: number;
};

type UseFileUploadOptions = {
  getUploadUrl: (fileName: string, contentType: string) => Promise<{ url: string; key: string }>;
  onUploadComplete: (result: UploadResult) => void;
  onError?: (error: Error) => void;
};

type UseFileUploadReturn = {
  upload: (file: File) => Promise<void>;
  progress: number;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
};

/**
 * Headless hook for uploading files to R2 via presigned URLs.
 *
 * Uses XMLHttpRequest for upload progress tracking.
 * The caller provides `getUploadUrl` which should call the backend
 * (e.g. tRPC upload.create) to obtain a presigned PUT URL and storage key.
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const { getUploadUrl, onUploadComplete, onError } = options;

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const reset = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Step 1: Get a presigned upload URL from the backend
        const { url, key } = await getUploadUrl(file.name, file.type);

        // Step 2: PUT the file directly to the presigned URL with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setProgress(percent);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload was cancelled'));
          });

          xhr.open('PUT', url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        xhrRef.current = null;

        // Step 3: Notify caller of successful upload
        onUploadComplete({
          key,
          url,
          fileName: file.name,
          size: file.size,
        });
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed');
        setError(uploadError);
        onError?.(uploadError);
      } finally {
        setIsUploading(false);
      }
    },
    [getUploadUrl, onUploadComplete, onError],
  );

  return { upload, progress, isUploading, error, reset };
}
