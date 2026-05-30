import * as schema from '@/database/schema';
import { OrgRole, type OrgRole as OrgRoleType } from '@cruzjs/saas';
import crypto from 'crypto';
import { getTestDrizzleClient } from './test-db';

const db = getTestDrizzleClient();

/**
 * Factory functions for creating test data
 */

export type UserFactoryData = {
  email?: string;
  name?: string;
  password?: string;
  emailVerified?: boolean;
  isAdmin?: boolean;
};

/**
 * Create a test user
 */
export async function createTestUser(
  data: UserFactoryData = {}
): Promise<schema.User> {
  const email = data.email || `test-${Date.now()}@example.com`;
  const name = data.name || 'Test User';
  const password = data.password || 'TestPassword123!';

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      password,
      emailVerified: data.emailVerified ? new Date() : null,
      isAdmin: data.isAdmin || false,
    })
    .returning();

  return user;
}

export type OrganizationFactoryData = {
  name?: string;
  slug?: string;
  settings?: Record<string, unknown>;
};

/**
 * Create a test organization
 */
export async function createTestOrganization(
  data: OrganizationFactoryData = {}
): Promise<schema.Organization> {
  const name = data.name || `Test Org ${Date.now()}`;
  const slug = data.slug || `test-org-${Date.now()}`;

  const [org] = await db
    .insert(schema.organizations)
    .values({
      name,
      slug,
      settings: data.settings || {},
    })
    .returning();

  return org;
}

/**
 * Add a user to an organization
 */
export async function addUserToOrg(
  userId: string,
  orgId: string,
  role: OrgRoleType = OrgRole.MEMBER
): Promise<schema.OrgMember> {
  const [member] = await db
    .insert(schema.orgMembers)
    .values({
      userId,
      orgId,
      role,
    })
    .returning();

  return member;
}

export type InvitationFactoryData = {
  email?: string;
  orgId: string;
  role?: OrgRoleType;
  expiresAt?: Date;
};

/**
 * Create a test invitation
 */
export async function createTestInvitation(
  data: InvitationFactoryData
): Promise<schema.Invitation> {
  const email = data.email || `invite-${Date.now()}@example.com`;
  const role = data.role || OrgRole.MEMBER;
  const expiresAt =
    data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');

  const [invitation] = await db
    .insert(schema.invitations)
    .values({
      email,
      orgId: data.orgId,
      role,
      token,
      expiresAt,
    })
    .returning();

  return invitation;
}
