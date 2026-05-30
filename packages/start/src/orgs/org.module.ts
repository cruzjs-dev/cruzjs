import { Module } from '@cruzjs/core/di';
import { ORG_SERVICE, MEMBER_SERVICE, PERMISSION_SERVICE, INVITATION_SERVICE } from '@cruzjs/core/orgs/interfaces';
import { invitationTrpc } from './invitation.trpc';
import { memberTrpc } from './member.trpc';
import { orgTrpc } from './org.trpc';
import { OrgService } from './org.service';
import { MemberService } from './member.service';
import { InvitationService } from './invitation.service';
import { PermissionService } from './permission.service';

@Module({
  providers: [
    OrgService,
    MemberService,
    InvitationService,
    PermissionService,
    // Bind to interface tokens so core middleware can resolve
    { provide: ORG_SERVICE, useExisting: OrgService },
    { provide: MEMBER_SERVICE, useExisting: MemberService },
    { provide: PERMISSION_SERVICE, useExisting: PermissionService },
    { provide: INVITATION_SERVICE, useExisting: InvitationService },
  ],
  trpcRouters: {
    org: orgTrpc,
    member: memberTrpc,
    invitation: invitationTrpc,
  },
})
export class OrgModule {}
