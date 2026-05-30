export type Organization = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  isCurrent: boolean;
};

export type SessionData = {
  userId: string;
  currentOrgId: string | null;
  expiresAt: string;
};

