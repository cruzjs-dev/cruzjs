// Services
export { OrgService } from './org.service';
export { MemberService } from './member.service';
export { InvitationService } from './invitation.service';
export { PermissionService } from './permission.service';

// Module
export { OrgModule } from './org.module';

// Routers
export { orgTrpc } from './org.trpc';
export { memberTrpc } from './member.trpc';
export { invitationTrpc } from './invitation.trpc';

// Hooks
export {
  useCurrentOrg,
  useSwitchOrg,
  registerOrgTRPC,
  type OrgTRPCHooks,
  type SessionData,
} from './org.hooks';

// Utils
export { getUserOrganizations, getUserOrgRole, isOrgOwner, isOrgAdminOrOwner, getUserRole } from './auth.utils';
export { generateSlug, generateUniqueSlug } from './slug.utils';

// Components
export {
  CreateOrgModal,
  EditInvitationForm,
  InvitationForm,
  MemberRow,
  MembersList,
  OrgCard,
  OrgLayout,
  OrgSwitcher,
  RoleSelector,
  SimpleOrgLayout,
} from './components';
export type { OrganizationWithStats } from './components';

// Pages
export {
  AcceptInvitationPage,
  CreateOrgPage,
  OrgLayoutRoute,
  OrgOverviewPage,
  OrgMembersPage,
  OrgSettingsPage,
  OrgInvitationsPage,
} from './pages';

// Events
export * from './events';
