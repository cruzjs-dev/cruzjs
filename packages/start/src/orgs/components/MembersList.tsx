import type { OrgRole } from '@cruzjs/core/database/schema';
import type { MemberResponse } from '@cruzjs/core/orgs/org.models';
import { getTRPC } from '@cruzjs/core/trpc/client';
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmModal,
  useToast,
} from '@cruzjs/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MemberRow } from './MemberRow';
import { RoleSelector } from './RoleSelector';

type MembersListProps = {
  orgId: string;
  orgSlug?: string;
  currentUserRole: OrgRole;
  currentUserId: string;
};

const MembersList: React.FC<MembersListProps> = ({ orgId, orgSlug, currentUserRole, currentUserId }) => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgRole>('MEMBER');
  const toast = useToast();

  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const { data: membersData, isLoading: loading, refetch } = trpc.member.list.useQuery();

  // Convert date strings from JSON serialization to Date objects and cast role
  const members: MemberResponse[] = (membersData?.members || []).map((member: any) => ({
    ...member,
    role: member.role as OrgRole,
    createdAt: new Date(member.createdAt),
    updatedAt: new Date(member.updatedAt),
  }));

  const updateRoleMutation = trpc.member.updateRole.useMutation({
    onSuccess: () => {
      showToast('Role updated successfully', 'success');
      setShowRoleDialog(false);
      setSelectedMember(null);
      refetch();
    },
    onError: (error: { message?: string }) => {
      showToast(error.message || 'Failed to update role', 'error');
    },
  });

  const removeMemberMutation = trpc.member.remove.useMutation({
    onSuccess: () => {
      showToast('Member removed successfully', 'success');
      setShowRemoveDialog(false);
      setSelectedMember(null);
      refetch();
    },
    onError: (error: { message?: string }) => {
      showToast(error.message || 'Failed to remove member', 'error');
    },
  });

  const leaveOrgMutation = trpc.member.leave.useMutation({
    onSuccess: async () => {
      showToast('You have left the organization', 'success');
      setShowLeaveDialog(false);
      // Invalidate all queries to refresh with new org context
      await queryClient.invalidateQueries();
      // Navigate to dashboard (will auto-switch to another org)
      navigate('/dashboard');
    },
    onError: (error: { message?: string }) => {
      showToast(error.message || 'Failed to leave organization', 'error');
    },
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: type === 'success' ? 'Success' : 'Error',
      description: message,
      status: type,
      duration: 3000,
      isClosable: true,
    });
  };

  const handleRoleChangeClick = (member: MemberResponse) => {
    setSelectedMember(member);
    setSelectedRole(member.role);
    setShowRoleDialog(true);
  };

  const handleRemoveClick = (member: MemberResponse) => {
    setSelectedMember(member);
    setShowRemoveDialog(true);
  };

  const handleRoleChangeConfirm = async () => {
    if (!selectedMember) return;
    await updateRoleMutation.mutateAsync({ userId: selectedMember.userId, role: selectedRole });
  };

  const handleRemoveConfirm = async () => {
    if (!selectedMember) return;
    await removeMemberMutation.mutateAsync({ userId: selectedMember.userId });
  };

  const handleLeaveOrg = () => {
    setShowLeaveDialog(true);
  };

  const handleLeaveConfirm = async () => {
    await leaveOrgMutation.mutateAsync();
  };

  // Check if current user can leave (not owner)
  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const canLeaveOrg = currentUserMember && currentUserMember.role !== 'OWNER';

  if (loading) {
    return <LoadingState size="xl" />;
  }

  return (
    <>
      <PageHeader
        title="Members"
        action={
          canManageMembers && (
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary-dark transition-colors"
              onClick={() => navigate(orgSlug ? `/orgs/${orgSlug}/invitations` : `/orgs/${orgId}/invitations`)}
            >
              Invite Member
            </button>
          )
        }
      />

      {members.length === 0 ? (
        <EmptyState message="No members found" />
      ) : (
        <div className="mt-4 flex flex-col">
          {members.map((member: MemberResponse) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              onRoleChange={handleRoleChangeClick}
              onRemove={handleRemoveClick}
            />
          ))}
        </div>
      )}

      {/* Role Change Modal */}
      <ConfirmModal
        isOpen={showRoleDialog}
        onClose={() => {
          setShowRoleDialog(false);
          setSelectedMember(null);
        }}
        onConfirm={handleRoleChangeConfirm}
        title="Change Role"
        confirmLabel="Confirm"
        isLoading={updateRoleMutation.isPending}
      >
        {selectedMember && (
          <>
            <p className="mb-4 text-text">
              Change role for{' '}
              <strong className="text-text-strong">{selectedMember.user.name || selectedMember.user.email}</strong>
            </p>
            <RoleSelector
              value={selectedRole}
              onChange={setSelectedRole}
              disabled={selectedMember.role === 'OWNER' && currentUserRole !== 'OWNER'}
            />
          </>
        )}
      </ConfirmModal>

      {/* Remove Member Modal */}
      <ConfirmModal
        isOpen={showRemoveDialog}
        onClose={() => {
          setShowRemoveDialog(false);
          setSelectedMember(null);
        }}
        onConfirm={handleRemoveConfirm}
        title="Remove Member"
        confirmLabel="Remove"
        variant="danger"
        isLoading={removeMemberMutation.isPending}
      >
        {selectedMember && (
          <>
            <p className="mb-4 text-text">
              Are you sure you want to remove{' '}
              <strong className="text-text-strong">{selectedMember.user.name || selectedMember.user.email}</strong>{' '}
              from this organization?
            </p>
            <p className="mb-4 text-sm text-red-600">This action cannot be undone.</p>
          </>
        )}
      </ConfirmModal>

      {/* Leave Organization Modal */}
      <ConfirmModal
        isOpen={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        onConfirm={handleLeaveConfirm}
        title="Leave Organization"
        confirmLabel="Leave Organization"
        variant="danger"
        isLoading={leaveOrgMutation.isPending}
      >
        <p className="mb-4 text-text">
          Are you sure you want to leave this organization? You will lose access to all organization content.
        </p>
        <p className="mb-4 text-sm text-red-600">
          You can rejoin later if you are invited again.
        </p>
      </ConfirmModal>

      {/* Leave Organization Section - Only show for non-owners */}
      {canLeaveOrg && (
        <div className="mt-8">
          <hr className="mb-6 border-surface-border" />
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="font-medium text-red-700 mb-2">
              Leave this organization
            </p>
            <p className="text-sm text-red-600 mb-4">
              Once you leave, you will lose access to all organization content. You can rejoin later if invited again.
            </p>
            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-red-600 text-red-600 bg-transparent hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLeaveOrg}
              disabled={leaveOrgMutation.isPending}
            >
              {leaveOrgMutation.isPending ? 'Leaving...' : 'Leave Organization'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export { MembersList };
