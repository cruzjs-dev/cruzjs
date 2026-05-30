import { AuthLayout } from '@cruzjs/core/framework/components/AuthLayout';
import { getTRPC } from '@cruzjs/core/trpc/client';

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Create Organization page - handles both regular organization creation and onboarding flow
 * When ?onboarding=true, shows welcome message and hides cancel button
 */
const CreateOrganizationPage: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';

  const createOrgMutation = trpc.org.create.useMutation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      const generatedSlug = generateSlug(name);
      setSlug(generatedSlug);
    }
  }, [name]);

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

      // Navigate to the new organization
      navigate(`/orgs/${org.slug}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create organization');
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <AuthLayout title="Create Organization">
      <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md max-w-md mx-auto">
        {isOnboarding ? (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-text-strong mb-1">Welcome!</h1>
            <p className="text-sm text-text-muted">
              Create your first organization to get started. Organizations help you
              manage your team and collaborate effectively.
            </p>
          </div>
        ) : (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-text-strong mb-1">Create Organization</h1>
            <p className="text-sm text-text-muted">Set up a new workspace for your team</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-text mb-1.5">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your organization name"
              autoFocus
              required
              className="w-full rounded-lg border border-surface-border bg-surface text-text-strong placeholder:text-text-muted
                px-3.5 py-2.5 text-sm outline-none
                focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="org-slug" className="block text-sm font-medium text-text mb-1.5">
              Slug
            </label>
            <input
              id="org-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-organization"
              className="w-full rounded-lg border border-surface-border bg-surface text-text-strong placeholder:text-text-muted
                px-3.5 py-2.5 text-sm outline-none
                focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs text-text-muted mt-1.5">
              URL-friendly identifier (auto-generated from organization name)
            </p>
          </div>

          <button
            type="submit"
            disabled={createOrgMutation.isPending || !name.trim()}
            className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-dark active:bg-primary-dark
              text-white text-sm font-medium transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          >
            {createOrgMutation.isPending
              ? 'Creating...'
              : isOnboarding
                ? 'Create My First Organization'
                : 'Create Organization'}
          </button>

          {!isOnboarding && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={createOrgMutation.isPending}
              className="w-full py-2.5 px-4 rounded-lg border border-surface-border bg-surface
                text-text text-sm font-medium transition-colors
                hover:bg-surface-lighter disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </AuthLayout>
  );
};

export default CreateOrganizationPage;
