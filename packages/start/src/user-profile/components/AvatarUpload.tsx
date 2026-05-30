import { getTRPC } from '@cruzjs/core/trpc/client';
import { ConfirmModal, useToast } from '@cruzjs/ui';
import { useRef, useState } from 'react';

type AvatarUploadProps = {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
};

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarUpdated,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const trpc = getTRPC();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a JPEG, PNG, WebP, or GIF image',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Validate file size (5MB max for avatars)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Avatar images must be less than 5MB',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createUploadMutation = trpc.upload.create.useMutation();
  const confirmUploadMutation = trpc.upload.confirm.useMutation();

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !preview) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Request upload URL
      const uploadResponse = await createUploadMutation.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        uploadType: 'avatar',
      });

      // Step 2: Upload to S3
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        xhr.open('PUT', uploadResponse.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Confirm upload
      const confirmResponse = await confirmUploadMutation.mutateAsync({
        uploadId: uploadResponse.id,
        key: uploadResponse.key,
      });

      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onAvatarUpdated && confirmResponse.url) {
        onAvatarUpdated(confirmResponse.url);
      }

      // Reload page to refresh avatar
      window.location.reload();
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload avatar',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const updateUserMutation = trpc.userProfile.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Avatar deleted',
        description: 'Your avatar has been removed',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setIsDeleteModalOpen(false);
      if (onAvatarUpdated) {
        onAvatarUpdated('');
      }

      // Reload page to refresh avatar
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete avatar',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleDelete = async () => {
    await updateUserMutation.mutateAsync({ avatarUrl: null });
  };

  const getAvatarUrl = () => {
    if (preview) return preview;
    if (currentAvatarUrl) {
      if (
        currentAvatarUrl.startsWith('http://') ||
        currentAvatarUrl.startsWith('https://')
      ) {
        return currentAvatarUrl;
      }
      return currentAvatarUrl;
    }
    return null;
  };

  const getInitials = () => {
    if (userName) {
      const parts = userName.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return userName[0].toUpperCase();
    }
    return '?';
  };

  const avatarUrl = getAvatarUrl();
  const isBusy =
    uploading ||
    createUploadMutation.isPending ||
    confirmUploadMutation.isPending;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar display */}
      <div className="relative">
        {avatarUrl ? (
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-primary">
            <img
              src={avatarUrl}
              alt={userName || 'Avatar'}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
            {getInitials()}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex w-full flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          id="avatar-upload-input"
        />
        <label
          htmlFor="avatar-upload-input"
          className={`cursor-pointer rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors ${
            isBusy ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Upload Avatar'}
        </label>

        {preview && (
          <>
            {uploading && (
              <div className="w-full">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-light">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-sm text-text-muted">
                  {Math.round(uploadProgress)}% uploaded
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={isBusy}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Save Avatar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={isBusy}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-text-muted hover:text-text-strong hover:bg-surface-light transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}

        {currentAvatarUrl && !preview && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isBusy}
            className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Delete Avatar
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Avatar"
        confirmLabel="Delete"
        variant="danger"
        isLoading={updateUserMutation.isPending}
      >
        <p className="text-text">
          Are you sure you want to delete your avatar? This action cannot be
          undone.
        </p>
      </ConfirmModal>
    </div>
  );
};

export { AvatarUpload };
