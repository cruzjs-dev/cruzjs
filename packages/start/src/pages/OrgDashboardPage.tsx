import { useParams } from 'react-router';
import { AppLayout } from '../layout/AppLayout';
import { PageHeader, LoadingState, EmptyState, ConfirmModal, useToast } from '@cruzjs/ui';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useOrgContext } from '@cruzjs/core/orgs/OrgContext';
import { useEffect, useState } from 'react';
import { DashboardBuilder } from '../dashboard/components';

/**
 * Dashboard Page
 *
 * Standalone org-level page for dashboard management.
 * Dashboard selector + DashboardBuilder for editing widget grids.
 */
const OrgDashboardPage: React.FC = () => {
  const trpc = getTRPC();
  const { slug } = useParams<{ slug: string }>();
  const { setOrgId } = useOrgContext();
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);

  // Get org data first to set org context
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

  const utils = trpc.useUtils();

  const { data: dashboards, isLoading: dashboardsLoading } = trpc.dashboard.list.useQuery(
    {},
    { enabled: !!orgData?.id }
  );

  // Auto-select default dashboard or first one
  useEffect(() => {
    if (dashboards && dashboards.length > 0 && !selectedDashboardId) {
      const defaultDash = dashboards.find((d: any) => d.isDefault);
      setSelectedDashboardId(defaultDash?.id ?? dashboards[0].id);
    }
  }, [dashboards, selectedDashboardId]);

  const selectedDashboard = dashboards?.find((d: any) => d.id === selectedDashboardId);

  const createMutation = trpc.dashboard.create.useMutation({
    onSuccess: (data: any) => {
      toast({
        title: 'Dashboard created',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setNewDashboardName('');
      setSelectedDashboardId(data.id);
      utils.dashboard.list.invalidate();
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create dashboard',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const deleteMutation = trpc.dashboard.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Dashboard deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setSelectedDashboardId(null);
      utils.dashboard.list.invalidate();
    },
  });

  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) return;
    createMutation.mutate({
      name: newDashboardName.trim(),
      widgets: [],
      isDefault: !dashboards || dashboards.length === 0,
    });
  };

  const loading = orgLoading || dashboardsLoading;

  if (loading) {
    return (
      <AppLayout>
        <LoadingState size="xl" text="Loading dashboard..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Customizable widget dashboards for your organization"
      />

      {/* Dashboard selector */}
      <div className="mt-4 mb-6 flex items-center gap-3">
        {dashboards && dashboards.length > 0 && (
          <select
            value={selectedDashboardId ?? ''}
            onChange={(e) => setSelectedDashboardId(e.target.value)}
            className="max-w-[300px] rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          >
            {dashboards.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-strong hover:bg-surface-light transition-colors"
        >
          New Dashboard
        </button>
        {selectedDashboard && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this dashboard?')) {
                deleteMutation.mutate({ dashboardId: selectedDashboard.id });
              }
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Dashboard content */}
      {selectedDashboard ? (
        <DashboardBuilder
          key={selectedDashboard.id}
          dashboardId={selectedDashboard.id}
          initialWidgets={(selectedDashboard.widgets ?? []) as any}
          dashboardName={selectedDashboard.name}
        />
      ) : (
        <EmptyState message="No dashboards yet. Create one to get started." />
      )}

      {/* Create dashboard modal */}
      <ConfirmModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setNewDashboardName('');
        }}
        onConfirm={handleCreateDashboard}
        title="New Dashboard"
        confirmLabel="Create"
        isLoading={createMutation.isPending}
      >
        <div>
          <label htmlFor="new-dashboard-name" className="block text-sm font-medium text-text-strong mb-1.5">
            Dashboard Name <span className="text-red-500">*</span>
          </label>
          <input
            id="new-dashboard-name"
            type="text"
            placeholder="e.g., Ops Overview"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </ConfirmModal>
    </AppLayout>
  );
};

export default OrgDashboardPage;
