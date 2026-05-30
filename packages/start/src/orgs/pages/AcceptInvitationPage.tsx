import { AppLayout } from '@cruzjs/start/layout/AppLayout';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import type { OrgRole } from '@cruzjs/core/database/schema';
import type { InvitationWithOrgResponse } from '@cruzjs/core/orgs/org.models';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { LoadingState, useToast } from '@cruzjs/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

const roleLabels: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const AcceptInvitationPage: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const { isAuthenticated } = useAuth();
  const { data: invitationData, isLoading: loading } =
    trpc.invitation.getByToken.useQuery(
      { token: token! },
      { enabled: !!token }
    );

  const invitation: InvitationWithOrgResponse | null = invitationData
    ? {
        ...invitationData,
        createdAt: new Date(invitationData.createdAt),
        expiresAt: new Date(invitationData.expiresAt),
      }
    : null;

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
    } else if (invitationData === null && !loading) {
      setError('Invalid or expired invitation');
    }
  }, [token, invitationData, loading]);

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success'
  ) => {
    toast({
      title: type === 'success' ? 'Success' : 'Error',
      description: message,
      status: type,
      duration: 3000,
      isClosable: true,
    });
  };

  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: () => {
      showToast('Invitation accepted successfully!', 'success');
      setTimeout(() => {
        if (invitation) {
          navigate(`/orgs/${invitation.organization.slug}`);
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to accept invitation');
      showToast(err.message || 'Failed to accept invitation', 'error');
    },
  });

  const declineMutation = trpc.invitation.decline.useMutation({
    onSuccess: () => {
      showToast('Invitation declined', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to decline invitation');
      showToast(err.message || 'Failed to decline invitation', 'error');
    },
  });

  const handleAccept = async () => {
    if (!token) return;

    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=/invitations/${token}`);
      return;
    }

    setError(null);
    await acceptMutation.mutateAsync({ token });
  };

  const handleDecline = async () => {
    if (!token) return;

    setError(null);
    await declineMutation.mutateAsync({ token });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState size="xl" />
        </div>
      </AppLayout>
    );
  }

  if (error || !invitation) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <h2 className="mb-4 text-2xl font-bold text-text-strong">
            Invalid Invitation
          </h2>
          <p className="mb-6 text-text-muted">
            {error || 'Invitation not found'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors"
            >
              Go to Dashboard
            </button>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="rounded-lg border border-surface-border bg-surface px-5 py-2.5 font-medium text-text-strong hover:bg-surface-light transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();

  if (isExpired) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <h2 className="mb-4 text-2xl font-bold text-text-strong">
            Invitation Expired
          </h2>
          <p className="mb-6 text-text-muted">
            This invitation has expired. Please request a new invitation.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-text-strong">
              You've been invited!
            </h2>
            <p className="text-text-muted">
              Join{' '}
              <strong className="text-text-strong">
                {invitation.organization.name}
              </strong>
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-surface-light p-6">
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-medium text-text-muted">
                  Organization
                </p>
                <p className="text-lg font-semibold text-text-strong">
                  {invitation.organization.name}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-text-muted">
                  Email
                </p>
                <p className="text-base text-text-strong">{invitation.email}</p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-text-muted">Role</p>
                <span className="inline-block rounded-full bg-primary-subtle px-3 py-0.5 text-sm font-medium text-primary">
                  {roleLabels[invitation.role]}
                </span>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-text-muted">
                  Expires
                </p>
                <p className="text-base text-text-strong">
                  {new Date(invitation.expiresAt).toLocaleDateString(
                    'en-US',
                    {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  )}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!isAuthenticated && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                You need to be logged in to accept this invitation. If you
                don't have an account, one will be created for you.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDecline}
              disabled={declineMutation.isPending}
              className="flex-1 rounded-lg border border-surface-border bg-surface px-5 py-2.5 font-medium text-text-strong hover:bg-surface-light transition-colors disabled:opacity-50"
            >
              {declineMutation.isPending ? 'Processing...' : 'Decline'}
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50"
            >
              {acceptMutation.isPending
                ? 'Processing...'
                : isAuthenticated
                  ? 'Accept Invitation'
                  : 'Login to Accept'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AcceptInvitationPage;
