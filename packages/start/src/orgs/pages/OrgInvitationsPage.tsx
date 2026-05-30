import { EditInvitationForm } from '../components/EditInvitationForm';
import { InvitationForm } from '../components/InvitationForm';
import type { OrgRole } from '@cruzjs/core/database/schema';
import type { InvitationResponse } from '@cruzjs/core/orgs/org.models';
import { getTRPC } from '@cruzjs/core/trpc/client';
import {
  PageHeader,
  PermissionDenied,
  LoadingState,
  EmptyState,
  ConfirmModal,
  useToast,
} from '@cruzjs/ui';
import type { OrgContext } from '@cruzjs/ui';
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';

const roleLabels: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const roleBadgeClasses: Record<OrgRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-surface-light text-text',
};

type FormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const FormModal: React.FC<FormModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Content */}
      <div className="relative w-full max-w-md rounded-xl bg-surface p-0 shadow-xl mx-4">
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h3 className="text-lg font-semibold text-text-strong">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-light hover:text-text-strong transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const OrgInvitationsPage: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const { organization, currentUserRole, orgId } = useOutletContext<OrgContext>();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationResponse | null>(null);
  const toast = useToast();

  const canManageInvitations = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const { data: invitationsData, isLoading: loading, refetch } = trpc.invitation.list.useQuery(undefined, {
    enabled: !!orgId,
  });

  const invitations = invitationsData?.invitations?.map((inv: any) => ({
    ...inv,
    createdAt: new Date(inv.createdAt),
    expiresAt: new Date(inv.expiresAt),
  })) || [];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: type === 'success' ? 'Success' : 'Error',
      description: message,
      status: type,
      duration: 3000,
      isClosable: true,
    });
  };

  const cancelInvitationMutation = trpc.invitation.cancel.useMutation({
    onSuccess: () => {
      showToast('Invitation canceled successfully', 'success');
      setShowCancelDialog(false);
      setSelectedInvitation(null);
      refetch();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to cancel invitation', 'error');
    },
  });

  const handleCancelConfirm = async () => {
    if (!selectedInvitation || !orgId) return;
    await cancelInvitationMutation.mutateAsync({ invitationId: selectedInvitation.id });
  };

  const handleInvitationSuccess = () => {
    showToast('Invitation sent successfully', 'success');
    setShowForm(false);
    refetch();
  };

  const handleEditSuccess = () => {
    showToast('Invitation updated successfully', 'success');
    setShowEditForm(false);
    setSelectedInvitation(null);
    refetch();
  };

  if (!canManageInvitations) {
    return (
      <PermissionDenied
        message="You don't have permission to manage invitations"
        actionLabel="Back to Members"
        onAction={() => navigate(`/orgs/${organization.slug}/members`)}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Pending Invitations"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          >
            Send Invitation
          </button>
        }
      />

      <div className="mt-6">
        {loading ? (
          <LoadingState text="Loading invitations..." />
        ) : invitations.length === 0 ? (
          <EmptyState message="No pending invitations" />
        ) : (
          <div className="flex flex-col">
            {invitations.map((invitation: InvitationResponse) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between border-b border-surface-border p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-text-strong">{invitation.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClasses[invitation.role]}`}
                    >
                      {roleLabels[invitation.role]}
                    </span>
                    <span className="text-xs text-text-muted">
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedInvitation(invitation);
                      setShowEditForm(true);
                    }}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-light transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInvitation(invitation);
                      setShowCancelDialog(true);
                    }}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-light transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Invitation Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Send Invitation"
      >
        {orgId && (
          <InvitationForm
            orgId={orgId}
            onSuccess={handleInvitationSuccess}
            onCancel={() => setShowForm(false)}
          />
        )}
      </FormModal>

      {/* Edit Invitation Modal */}
      <FormModal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedInvitation(null);
        }}
        title="Edit Invitation"
      >
        {selectedInvitation && orgId && (
          <EditInvitationForm
            invitation={selectedInvitation}
            orgId={orgId}
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setShowEditForm(false);
              setSelectedInvitation(null);
            }}
          />
        )}
      </FormModal>

      {/* Cancel Invitation Modal */}
      <ConfirmModal
        isOpen={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setSelectedInvitation(null);
        }}
        onConfirm={handleCancelConfirm}
        title="Cancel Invitation"
        confirmLabel="Yes, Cancel"
        cancelLabel="No"
        variant="danger"
        isLoading={cancelInvitationMutation.isPending}
      >
        {selectedInvitation && (
          <p className="text-text">
            Are you sure you want to cancel the invitation to{' '}
            <strong>{selectedInvitation.email}</strong>?
          </p>
        )}
      </ConfirmModal>
    </>
  );
};

export default OrgInvitationsPage;
