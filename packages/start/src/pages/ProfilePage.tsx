import { AppLayout } from '@cruzjs/start/layout/AppLayout';
import { AvatarUpload } from '@cruzjs/start/user-profile/components/AvatarUpload';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import {
  PageHeader,
  SectionCard,
  LoadingState,
  DetailRow,
} from '@cruzjs/ui';
import { useNavigate } from 'react-router';

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  avatarUrl: string | null;
  createdAt?: Date;
};

const UserIcon = () => (
  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, loading } = useAuth();

  const user: UserProfile | null = authUser ? {
    ...authUser,
    emailVerified: authUser.emailVerified ? new Date(authUser.emailVerified) : null,
    createdAt: authUser.createdAt ? new Date(authUser.createdAt) : undefined,
  } : null;

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

  const emailValue = (
    <span className="flex items-center gap-2">
      <span>{user.email}</span>
      {user.emailVerified ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          Verified
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          Unverified
        </span>
      )}
    </span>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-8">
        <PageHeader title="Profile" />

        <div className="mt-8 space-y-6">
          <SectionCard title="Avatar">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={user.avatarUrl}
              userName={user.name}
              onAvatarUpdated={() => {
                window.location.reload();
              }}
            />
          </SectionCard>

          <SectionCard title="Account Information">
            <div className="space-y-5">
              <DetailRow
                icon={<UserIcon />}
                label="Name"
                value={user.name || 'Not set'}
              />
              <DetailRow
                icon={<MailIcon />}
                label="Email"
                value={emailValue}
              />
              {user.createdAt && (
                <DetailRow
                  icon={<CalendarIcon />}
                  label="Member Since"
                  value={new Date(
                    typeof user.createdAt === 'string'
                      ? user.createdAt
                      : user.createdAt
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
              )}
            </div>
          </SectionCard>

          <button
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 font-medium transition-colors"
            onClick={() => navigate('/profile/settings')}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
