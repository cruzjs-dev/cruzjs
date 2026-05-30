import { getTRPC } from '@cruzjs/core/trpc/client';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

type CreateOrgModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const CreateOrgModal: React.FC<CreateOrgModalProps> = ({
  isOpen,
  onClose,
}) => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const createOrgMutation = trpc.org.create.useMutation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (name) {
      const generatedSlug = generateSlug(name);
      setSlug(generatedSlug);
    }
  }, [name]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setName('');
      setSlug('');
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    if (name.length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (name.length > 50) {
      setError('Organization name must be at most 50 characters');
      return;
    }

    try {
      const org = await createOrgMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || undefined,
      });

      if (!org || !org.id || !org.slug) {
        throw new Error('Invalid response from server');
      }

      // Close modal and navigate to the new org
      onClose();
      navigate(`/orgs/${org.slug}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create organization');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-md bg-surface rounded-xl shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="text-lg font-semibold text-text-strong">
              Create Organization
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted hover:text-text-strong hover:bg-surface-light transition-colors"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-strong mb-1.5">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your organization name"
                  autoFocus
                  className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-strong mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-org"
                  className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <p className="mt-1 text-xs text-text-muted">
                  URL-friendly identifier (auto-generated from organization
                  name)
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createOrgMutation.isPending}
              className="rounded-lg px-5 py-2.5 font-medium text-text hover:bg-surface-light transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createOrgMutation.isPending}
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createOrgMutation.isPending
                ? 'Creating...'
                : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
