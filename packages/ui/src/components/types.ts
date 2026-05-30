import type { OrgRole } from '@cruzjs/saas/database/schema';

/**
 * Organization with stats - minimal type for UI components
 * The full type is defined in the app layer
 */
export type OrganizationWithStats = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  pendingInvites?: number;
};

export type OrgContext = {
  organization: OrganizationWithStats;
  currentUserRole: OrgRole | null;
  currentUserId: string | null;
  orgId: string;
};

export type ColorVariant = 
  | 'primary'
  | 'emerald'
  | 'cyan'
  | 'amber'
  | 'red'
  | 'purple'
  | 'slate'
  | 'blue'
  | 'green'
  | 'orange'
  | 'gray';

