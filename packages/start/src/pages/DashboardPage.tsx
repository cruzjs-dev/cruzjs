import { AppLayout } from '@cruzjs/start/layout/AppLayout';
import { OrgCard } from '@cruzjs/start/orgs/components/OrgCard';
import { CreateOrgModal } from '@cruzjs/start/orgs/components/CreateOrgModal';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { LoadingState } from '@cruzjs/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

const PlusIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

const DashboardPage: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false);

  const { data: orgsData, isLoading: orgsLoading } = trpc.org.list.useQuery();

  useEffect(() => {
    if (!orgsLoading && orgsData?.organizations && !hasAutoRedirected) {
      if (orgsData.organizations.length === 0) {
        setHasAutoRedirected(true);
        navigate('/orgs/new?onboarding=true');
      }
      else if (orgsData.organizations.length === 1) {
        setHasAutoRedirected(true);
        navigate(`/orgs/${orgsData.organizations[0].slug}`);
      }
    }
  }, [orgsData, orgsLoading, hasAutoRedirected, navigate]);

  const organizations: OrganizationResponse[] = (orgsData?.organizations ?? []).map((org: any) => ({
    ...org,
    createdAt: new Date(org.createdAt),
    updatedAt: new Date(org.updatedAt),
  }));

  if (authLoading || (orgsData?.organizations?.length === 1 && !hasAutoRedirected)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingState size="xl" />
        </div>
      </AppLayout>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Hero Section */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] text-text-muted font-medium mb-1">
              Welcome back
            </p>
            <h1 className="text-xl font-semibold text-text-strong mb-1">
              Hello, {firstName}
            </h1>
            <p className="text-[13px] text-text-muted">
              Manage your organizations and projects.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {organizations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface border border-surface-border p-4 transition-all duration-150">
              <div className="w-8 h-8 rounded-md bg-primary-subtle flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-[11px] text-text-muted font-medium mb-0.5">
                Organizations
              </p>
              <p className="text-xl font-semibold text-text-strong">
                {organizations.length}
              </p>
            </div>

            <div className="rounded-lg bg-surface border border-surface-border p-4 transition-all duration-150">
              <div className="w-8 h-8 rounded-md bg-primary-subtle flex items-center justify-center mb-3">
                <CheckCircleIcon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[11px] text-text-muted font-medium mb-0.5">
                Status
              </p>
              <p className="text-xl font-semibold text-primary">
                Active
              </p>
            </div>

            <div className="rounded-lg bg-surface border border-surface-border p-4 transition-all duration-150">
              <div className="w-8 h-8 rounded-md bg-primary-subtle flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[11px] text-text-muted font-medium mb-0.5">
                Quick Actions
              </p>
              <p className="text-xl font-semibold text-text-strong">
                Ready
              </p>
            </div>
          </div>
        )}

        {/* Organizations Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-text-strong mb-0.5">
                Your Organizations
              </h2>
              <p className="text-text-muted text-[13px]">
                {organizations.length === 0
                  ? 'Get started by creating your first organization'
                  : `${organizations.length} ${organizations.length === 1 ? 'org' : 'orgs'} available`}
              </p>
            </div>
            <button
              onClick={() => setIsCreateOrgModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-white hover:bg-primary-dark text-[13px] font-medium rounded-md px-3 py-1.5 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Organization
            </button>
          </div>

          {organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 gap-5 bg-surface rounded-lg border border-surface-border">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-surface-light flex items-center justify-center">
                  <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <h3 className="text-sm font-semibold text-text-strong">
                  No organizations yet
                </h3>
                <p className="text-text-muted max-w-sm text-center text-[13px]">
                  Organizations help you manage your projects and members. Create your first to get started.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOrgModalOpen(true)}
                className="bg-primary text-white hover:bg-primary-dark text-[13px] font-medium rounded-md px-6 py-1.5 transition-colors"
              >
                Create Your First Organization
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {organizations.map((org: OrganizationResponse) => (
                <OrgCard key={org.id} organization={org} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateOrgModal
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
      />
    </AppLayout>
  );
};

export default DashboardPage;
