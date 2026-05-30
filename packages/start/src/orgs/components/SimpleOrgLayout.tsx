import { AppLayout } from '../../layout/AppLayout';
import { useOrgContext } from '@cruzjs/core/orgs/OrgContext';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { LoadingState } from '@cruzjs/ui';
import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';

type OrganizationWithStats = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
};

const SimpleOrgLayout: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { setOrgId } = useOrgContext();
  const { user } = useAuth();
  const { data: orgData, isLoading: orgLoading } = trpc.org.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  useEffect(() => {
    if (orgData?.id) {
      setOrgId(orgData.id);
    }
    return () => setOrgId(null);
  }, [orgData?.id, setOrgId]);

  const { data: membersData } = trpc.member.list.useQuery(undefined, {
    enabled: !!orgData?.id,
  });

  const organization = orgData
    ? ({
        ...orgData,
        createdAt: new Date(orgData.createdAt),
        updatedAt: new Date(orgData.updatedAt),
      } as OrganizationWithStats)
    : null;
  const loading = orgLoading;
  const currentUserId = user?.id || null;
  const currentMember = membersData?.members?.find(
    (m: { userId: string }) => m.userId === currentUserId
  );
  const currentUserRole = currentMember?.role || null;

  useEffect(() => {
    if (!slug) {
      navigate('/dashboard');
    }
  }, [slug, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState size="xl" />
        </div>
      </AppLayout>
    );
  }

  if (!organization) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-surface-light to-surface-lighter flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-text-strong mb-2">Organization not found</h3>
          <p className="text-text-muted mb-6">The organization you're looking for doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
          >
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-lg shadow-surface-light/50">
        <Outlet
          context={{
            organization,
            currentUserRole,
            currentUserId,
            orgId: organization.id,
          }}
        />
      </div>
    </AppLayout>
  );
};

export { SimpleOrgLayout };
