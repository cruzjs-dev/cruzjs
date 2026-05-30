import { Injectable, Inject } from '@cruzjs/core/di';
import { authIdentity } from '@cruzjs/core/database/schema';
import {
  type OrgRole,
  invitations,
  organizations,
  orgMembers,
} from '@cruzjs/core/database/schema';
import { userProfile } from '../database/schema';
import { IdentityCreatedEvent } from '@cruzjs/core/auth/events/identity-created.event';
import { JobService } from '@cruzjs/core/jobs/job.service';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { createHash, randomBytes } from 'crypto';
import { and, desc, eq, gt, lt } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { MemberService } from './member.service';
import type {
  CreateInvitationInput,
  InvitationResponse,
  InvitationWithOrgResponse,
} from '@cruzjs/core/orgs/org.models';

/**
 * Invitation service for organization invitations
 */
@Injectable()
export class InvitationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(MemberService) private readonly memberService: MemberService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(EventEmitterService) private readonly events: EventEmitterService
  ) {}

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash an invitation token for storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create an invitation for an organization
   */
  async createInvitation(
    orgId: string,
    input: CreateInvitationInput,
    invitedBy: string
  ): Promise<{ invitation: InvitationResponse; token: string }> {
    // Check if identity is already a member
    const [existingIdentity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.email, input.email))
      .limit(1);

    if (existingIdentity) {
      const [existingMember] = await this.db
        .select()
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, orgId),
            eq(orgMembers.userId, existingIdentity.id)
          )
        )
        .limit(1);

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }
    }

    const nowISO = new Date().toISOString();

    // Check if there's already a pending invitation for this email
    const [existingInvitation] = await this.db
      .select()
      .from(invitations)
      .where(
        and(eq(invitations.email, input.email), eq(invitations.orgId, orgId))
      )
      .limit(1);

    if (existingInvitation) {
      // Check if invitation is expired (string comparison for ISO dates)
      if (existingInvitation.expiresAt < nowISO) {
        // Delete expired invitation and create new one
        await this.db
          .delete(invitations)
          .where(eq(invitations.id, existingInvitation.id));
      } else {
        throw new Error('An invitation has already been sent to this email');
      }
    }

    // Generate token
    const token = this.generateInvitationToken();
    const hashedToken = this.hashToken(token);

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const [invitation] = await this.db
      .insert(invitations)
      .values({
        email: input.email,
        orgId,
        role: input.role,
        token: hashedToken,
        expiresAt: expiresAt.toISOString(),
      })
      .returning();

    // Get inviter identity and profile separately
    const [inviterIdentity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, invitedBy))
      .limit(1);
    const [inviterProfile] = inviterIdentity
      ? await this.db
          .select()
          .from(userProfile)
          .where(eq(userProfile.userId, inviterIdentity.id))
          .limit(1)
      : [null];

    // Get organization
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const acceptUrl = `${appUrl}/invitations/${token}/accept`;
    const declineUrl = `${appUrl}/invitations/${token}/decline`;

    // Queue invitation email job with NORMAL priority
    await this.jobService.createJob({
      type: 'send-email',
      payload: {
        to: input.email,
        template: 'invitation',
        data: {
          inviterName: inviterProfile?.fullName || inviterIdentity?.email || 'Someone',
          organizationName: organization?.name || 'Organization',
          role: input.role,
          acceptUrl,
          declineUrl,
        },
      },
      priority: 'NORMAL',
    });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        orgId: invitation.orgId,
        role: invitation.role as OrgRole,
        expiresAt: new Date(invitation.expiresAt),
        createdAt: new Date(invitation.createdAt),
      },
      token, // Return unhashed token for email link
    };
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId?: string): Promise<void> {
    // Hash the token to look it up
    const hashedToken = this.hashToken(token);

    // Find invitation
    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.token, hashedToken))
      .limit(1);

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    // Get organization
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invitation.orgId))
      .limit(1);

    const nowISO = new Date().toISOString();

    // Check if invitation is expired
    if (invitation.expiresAt < nowISO) {
      throw new Error('Invitation has expired');
    }

    // If userId is provided, verify the email matches
    if (userId) {
      const [userIdentity] = await this.db
        .select()
        .from(authIdentity)
        .where(eq(authIdentity.id, userId))
        .limit(1);

      if (!userIdentity || userIdentity.email !== invitation.email) {
        throw new Error('Invitation email does not match your account email');
      }
    }

    // Check if identity already exists by email
    let [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.email, invitation.email))
      .limit(1);

    // If identity doesn't exist, create a new identity
    if (!identity) {
      // Create identity without password (they can set it via password reset)
      [identity] = await this.db
        .insert(authIdentity)
        .values({
          email: invitation.email,
          emailVerified: null, // Email not verified yet
        })
        .returning();

      // Emit IdentityCreatedEvent - app listens to create UserProfile
      await this.events.dispatch(
        new IdentityCreatedEvent({
          identityId: identity.id,
          email: identity.email,
          initialName: invitation.email.split('@')[0], // Use email prefix as default name
        })
      );
    }

    // Check if identity is already a member
    const [existingMember] = await this.db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, invitation.orgId),
          eq(orgMembers.userId, identity.id)
        )
      )
      .limit(1);

    if (existingMember) {
      // Delete invitation since user is already a member
      await this.db
        .delete(invitations)
        .where(eq(invitations.id, invitation.id));
      throw new Error('You are already a member of this organization');
    }

    // Add identity to organization with specified role
    await this.memberService.addMember(
      invitation.orgId,
      identity.id,
      invitation.role as OrgRole
    );

    // Delete invitation
    await this.db.delete(invitations).where(eq(invitations.id, invitation.id));
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(token: string): Promise<void> {
    // Hash the token to look it up
    const hashedToken = this.hashToken(token);

    // Find and delete invitation
    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.token, hashedToken))
      .limit(1);

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    await this.db.delete(invitations).where(eq(invitations.id, invitation.id));
  }

  /**
   * Update an invitation
   */
  async updateInvitation(
    orgId: string,
    invitationId: string,
    updates: { role?: OrgRole; expiresAt?: Date }
  ): Promise<InvitationResponse> {
    // Verify invitation belongs to organization
    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.orgId !== orgId) {
      throw new Error('Invitation does not belong to this organization');
    }

    const nowISO = new Date().toISOString();

    // Check if invitation is expired
    if (invitation.expiresAt < nowISO) {
      throw new Error('Cannot update an expired invitation');
    }

    // Update invitation
    const updateData: { role?: string; expiresAt?: string } = {};
    if (updates.role) updateData.role = updates.role;
    if (updates.expiresAt) updateData.expiresAt = updates.expiresAt.toISOString();

    const [updatedInvitation] = await this.db
      .update(invitations)
      .set(updateData)
      .where(eq(invitations.id, invitationId))
      .returning();

    return {
      id: updatedInvitation.id,
      email: updatedInvitation.email,
      orgId: updatedInvitation.orgId,
      role: updatedInvitation.role as OrgRole,
      expiresAt: new Date(updatedInvitation.expiresAt),
      createdAt: new Date(updatedInvitation.createdAt),
    };
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(orgId: string, invitationId: string): Promise<void> {
    // Verify invitation belongs to organization
    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.orgId !== orgId) {
      throw new Error('Invitation does not belong to this organization');
    }

    await this.db.delete(invitations).where(eq(invitations.id, invitationId));
  }

  /**
   * List all invitations for an organization
   */
  async listInvitations(orgId: string): Promise<InvitationResponse[]> {
    const nowISO = new Date().toISOString();

    const orgInvitations = await this.db
      .select()
      .from(invitations)
      .where(
        and(eq(invitations.orgId, orgId), gt(invitations.expiresAt, nowISO))
      )
      .orderBy(desc(invitations.createdAt));

    return orgInvitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      orgId: invitation.orgId,
      role: invitation.role as OrgRole,
      expiresAt: new Date(invitation.expiresAt),
      createdAt: new Date(invitation.createdAt),
    }));
  }

  /**
   * Get invitation by token (for accepting/declining)
   */
  async getInvitationByToken(
    token: string
  ): Promise<InvitationWithOrgResponse | null> {
    const hashedToken = this.hashToken(token);

    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.token, hashedToken))
      .limit(1);

    if (!invitation) {
      return null;
    }

    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invitation.orgId))
      .limit(1);

    return {
      id: invitation.id,
      email: invitation.email,
      orgId: invitation.orgId,
      role: invitation.role as OrgRole,
      expiresAt: new Date(invitation.expiresAt),
      createdAt: new Date(invitation.createdAt),
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        avatarUrl: organization.avatarUrl,
      },
    };
  }

  /**
   * Clean up expired invitations
   * This should be called by a background job (Task 24)
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const nowISO = new Date().toISOString();

    await this.db
      .delete(invitations)
      .where(lt(invitations.expiresAt, nowISO));

    // D1 doesn't return rowCount, so we return 0
    return 0;
  }
}
