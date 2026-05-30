import type { OrgRole } from '@cruzjs/core/database/schema';
import { getTRPC } from '@cruzjs/core/trpc/client';
import {
  PageHeader,
  SectionCard,
  PermissionDenied,
  ConfirmModal,
  useToast,
} from '@cruzjs/ui';
import type { OrgContext } from '@cruzjs/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { ApiKeyManager } from '../../api-keys/components';
import { AiConnectionsManager } from '../../ai-connections/components';

const OrgSettingsPage: React.FC = () => {
  const trpc = getTRPC();
  const { organization, currentUserRole, orgId } = useOutletContext<OrgContext>();
  const navigate = useNavigate();
  const toast = useToast();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [avatarUrl, setAvatarUrl] = useState(organization.avatarUrl || '');

  // Errors
  const [nameError, setNameError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [avatarUrlError, setAvatarUrlError] = useState('');

  const canEdit = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  useEffect(() => {
    setName(organization.name);
    setSlug(organization.slug);
    setAvatarUrl(organization.avatarUrl || '');
  }, [organization]);

  const validateForm = (): boolean => {
    let valid = true;
    setNameError('');
    setSlugError('');
    setAvatarUrlError('');

    if (!name || name.trim().length < 2) {
      setNameError('Organization name must be at least 2 characters');
      valid = false;
    }
    if (name && name.length > 50) {
      setNameError('Organization name must be at most 50 characters');
      valid = false;
    }
    if (slug && slug.length < 2) {
      setSlugError('Slug must be at least 2 characters');
      valid = false;
    }
    if (slug && slug.length > 50) {
      setSlugError('Slug must be at most 50 characters');
      valid = false;
    }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setSlugError('Slug can only contain lowercase letters, numbers, and hyphens');
      valid = false;
    }
    if (avatarUrl && avatarUrl.trim() !== '') {
      try {
        new URL(avatarUrl);
      } catch {
        setAvatarUrlError('Avatar URL must be a valid URL');
        valid = false;
      }
    }
    return valid;
  };

  const updateOrgMutation = trpc.org.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Organization updated',
        description: 'Your organization settings have been saved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const deleteOrgMutation = trpc.org.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Organization deleted',
        description: 'The organization has been deleted.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete organization',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    await updateOrgMutation.mutateAsync({
      name: name.trim(),
      slug: slug.trim() || undefined,
      avatarUrl: avatarUrl.trim() || null,
    });
  };

  const handleDelete = async () => {
    await deleteOrgMutation.mutateAsync();
  };

  if (!canEdit) {
    return (
      <PermissionDenied
        message="You don't have permission to edit organization settings. Only owners and admins can modify settings."
      />
    );
  }

  return (
    <>
      <PageHeader title="Settings" />

      <div className="mt-6 space-y-6">
        {/* Organization Name */}
        <SectionCard title="Organization Name">
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-text-strong mb-1.5">
              Name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {nameError && (
              <p className="text-sm text-red-600 mt-1">{nameError}</p>
            )}
          </div>
        </SectionCard>

        {/* Organization Slug */}
        <SectionCard title="Organization Slug">
          <div>
            <label htmlFor="org-slug" className="block text-sm font-medium text-text-strong mb-1.5">
              Slug
            </label>
            <input
              id="org-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="organization-slug"
              className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <p className="text-sm text-text-muted mt-1">
              Used in URLs. Only lowercase letters, numbers, and hyphens allowed.
            </p>
            {slugError && (
              <p className="text-sm text-red-600 mt-1">{slugError}</p>
            )}
          </div>
        </SectionCard>

        {/* Avatar URL */}
        <SectionCard title="Avatar URL">
          <div>
            <label htmlFor="org-avatar" className="block text-sm font-medium text-text-strong mb-1.5">
              Avatar URL (optional)
            </label>
            <input
              id="org-avatar"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {avatarUrlError && (
              <p className="text-sm text-red-600 mt-1">{avatarUrlError}</p>
            )}
          </div>
        </SectionCard>

        {/* Save Button */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateOrgMutation.isPending}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* API Keys */}
        <SectionCard title="API Keys">
          <p className="text-sm text-text-muted mb-4">
            API keys allow agents and integrations to authenticate with your organization.
          </p>
          <ApiKeyManager />
        </SectionCard>

        {/* AI Providers */}
        <SectionCard title="AI Providers">
          <p className="text-sm text-text-muted mb-4">
            Connect AI providers to enable project chat and AI-powered features. API keys are encrypted at rest.
          </p>
          <AiConnectionsManager />
        </SectionCard>

        {/* Danger Zone */}
        {currentUserRole === 'OWNER' && (
          <SectionCard title="Danger Zone" variant="danger">
            <p className="text-sm text-text-muted mb-4">
              Once you delete an organization, there is no going back. Please be certain.
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete Organization
            </button>
          </SectionCard>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Organization"
        confirmLabel="Delete Organization"
        variant="danger"
        isLoading={deleteOrgMutation.isPending}
      >
        <p className="mb-4 text-sm text-text-strong">
          Are you sure you want to delete <strong>{organization.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700">
            All data associated with this organization will be permanently deleted.
          </p>
        </div>
      </ConfirmModal>
    </>
  );
};

export default OrgSettingsPage;
