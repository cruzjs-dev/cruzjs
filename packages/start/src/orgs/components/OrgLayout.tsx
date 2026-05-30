import { AppLayout } from '../../layout/AppLayout';
import { useOrgContext } from '@cruzjs/core/orgs/OrgContext';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { OrgHeader, LoadingState, TabNavigation } from '@cruzjs/ui';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';

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

const ORG_TABS = [
  { path: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: 'members', label: 'Members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: 'invitations', label: 'Invitations', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { path: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { path: 'billing', label: 'Billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3V10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
];

const OrgLayout: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { setOrgId, orgIdRef } = useOrgContext();
  const { user, loading: authLoading } = useAuth();
  const { data: orgData, isLoading: orgLoading } = trpc.org.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  // Write orgIdRef synchronously so child queries have org context on first render
  if (orgData?.id && orgIdRef.current !== orgData.id) {
    orgIdRef.current = orgData.id;
  }

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
  const loading = orgLoading || authLoading;
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
        <LoadingState size="xl" />
      </AppLayout>
    );
  }

  if (!organization) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-surface-light to-surface-lighter flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

  const pathParts = location.pathname.split('/').filter(Boolean);
  const orgIndex = pathParts.indexOf('orgs');
  const tabPath = pathParts[orgIndex + 2] || 'overview';
  const currentTab = ORG_TABS.find((t) => t.path === tabPath)?.path || 'overview';

  return (
    <AppLayout>
      <div className="bg-surface-light rounded-2xl shadow-sm border border-surface-lighter p-6 space-y-6">
        <OrgHeader
          name={organization.name}
          slug={organization.slug}
          avatarUrl={organization.avatarUrl}
          memberCount={organization.memberCount}
          status="active"
        />

        <TabNavigation
          tabs={ORG_TABS}
          currentTab={currentTab}
          basePath={`/orgs/${organization.slug}`}
        />

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

export { OrgLayout };
export type { OrganizationWithStats };
