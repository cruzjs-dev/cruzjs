import { AppLayout } from '../layout/AppLayout';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { getCurrentUser, logout } from '@cruzjs/core/auth/auth-client';
import {
  PageHeader,
  SectionCard,
  LoadingState,
  ConfirmModal,
  useToast,
} from '@cruzjs/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  avatarUrl: string | null;
  createdAt?: Date;
};

type OAuthAccount = {
  id: string;
  type: string;
  provider: string;
  providerAccountId: string;
};

const ProfileSettingsPage: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const toast = useToast();
  const [accounts, setAccounts] = useState<OAuthAccount[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Name form state
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [deletePassword, setDeletePassword] = useState('');

  const { data: sessionData, isLoading: loading } = trpc.auth.session.useQuery();

  const user = sessionData?.user ? {
    ...sessionData.user,
    emailVerified: sessionData.user.emailVerified ? new Date(sessionData.user.emailVerified) : null,
    createdAt: sessionData.user.createdAt ? new Date(sessionData.user.createdAt) : undefined,
  } as UserProfile : null;

  useEffect(() => {
    if (sessionData?.user) {
      setName(sessionData.user.name || '');
    }
    if (sessionData === null && !loading) {
      navigate('/auth/login');
    }
  }, [sessionData, loading, navigate]);

  // TODO: Load OAuth accounts - need to add endpoint to user router
  useEffect(() => {
    if (sessionData?.user?.id) {
      setAccounts([]);
    }
  }, [sessionData?.user?.id]);

  const updateUserMutation = trpc.userProfile.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your name has been updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      window.location.reload();
    },
    onError: (error: any) => {
      setNameError(error.message || 'Failed to update name');
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update name',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleUpdateName = async () => {
    if (!user) return;

    setNameError('');
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }

    await updateUserMutation.mutateAsync({ name: name.trim() });
  };

  const changePasswordMutation = trpc.userProfile.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});

      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to change password';
      setPasswordErrors({ newPassword: message });
      toast({
        title: 'Password change failed',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleChangePassword = async () => {
    if (!user) return;

    const errors: typeof passwordErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Password must contain an uppercase letter';
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = 'Password must contain a lowercase letter';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'Password must contain a number';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    await changePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
    });
  };

  const handleUnlinkAccount = async (accountId: string) => {
    if (!user) return;

    // TODO: Add OAuth account unlink endpoint to user router
    toast({
      title: 'Not implemented',
      description: 'OAuth account unlinking is not yet available via tRPC',
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (!deletePassword) {
      toast({
        title: 'Password required',
        description: 'Please enter your password to confirm account deletion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // TODO: Add account deletion endpoint to user router
    toast({
      title: 'Not implemented',
      description: 'Account deletion is not yet available via tRPC',
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <LoadingState size="xl" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="p-8">
          <p className="text-text-muted">Failed to load profile</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-8">
        <PageHeader title="Profile Settings" />

        <div className="mt-8 space-y-6">
          {/* Edit Name */}
          <SectionCard title="Edit Name">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-text-strong mb-1.5">
                Name
              </label>
              <div className="flex gap-3">
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={handleUpdateName}
                  disabled={updateUserMutation.isPending}
                  className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
              {nameError && (
                <p className="text-sm text-red-600 mt-1">{nameError}</p>
              )}
            </div>
          </SectionCard>

          {/* Change Password */}
          {user.emailVerified && (
            <SectionCard title="Change Password">
              <div className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-text-strong mb-1.5">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-text-strong mb-1.5">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-text-strong mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </SectionCard>
          )}

          {/* OAuth Accounts */}
          {accounts && accounts.length > 0 && (
            <SectionCard title="Connected Accounts">
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize text-text-strong">
                        {account.provider}
                      </p>
                      <p className="text-sm text-text-muted">
                        Connected account
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkAccount(account.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Delete Account */}
          <SectionCard title="Delete Account" variant="danger">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
              <div className="flex gap-3">
                <svg className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-amber-800">
                  Deleting your account will permanently remove all your data.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-5 py-2.5 font-medium transition-colors"
            >
              Delete Account
            </button>
          </SectionCard>
        </div>

        {/* Delete Account Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletePassword('');
          }}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          confirmLabel="Delete Account"
          variant="danger"
          isLoading={false}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-800">
                  This will permanently delete your account and all associated
                  data. This action cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-text-strong mb-1.5">
                Enter your password to confirm
              </label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>
        </ConfirmModal>
      </div>
    </AppLayout>
  );
};

export default ProfileSettingsPage;
