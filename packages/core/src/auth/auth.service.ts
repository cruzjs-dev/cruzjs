import { Injectable, Inject } from '../di';
import { config } from '../shared/config';
import { ConfigService } from '../shared/config/config.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { JobService } from '../jobs/job.service';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { authIdentity } from '../database/schema';
import { eq } from 'drizzle-orm';
import { DELETE_ACCOUNT_JOB_TYPE, type DeleteAccountJobPayload } from '../jobs/job.types';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.models';
import { SessionService } from './session.service';
import { EventEmitterService } from '../shared/events/event-emitter.service.server';
import { IdentityCreatedEvent } from './events/identity-created.event';

/**
 * Authentication service for password-based authentication
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(EventEmitterService) private readonly events: EventEmitterService
  ) {}

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const rounds = config.auth?.bcryptRounds ?? 10;
    return bcrypt.hash(password, rounds);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * Requirements: min 8 chars, at least one uppercase, one lowercase, one number
   */
  validatePasswordStrength(password: string): boolean {
    if (password.length < 8) {
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      return false;
    }
    if (!/[a-z]/.test(password)) {
      return false;
    }
    if (!/[0-9]/.test(password)) {
      return false;
    }
    return true;
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Register a new user with email and password
   */
  async register(
    input: RegisterInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    // Check if identity already exists
    const [existingIdentity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.email, input.email.toLowerCase()))
      .limit(1);

    if (existingIdentity) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    if (!this.validatePasswordStrength(input.password)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, and number'
      );
    }

    // Hash password
    const hashedPassword = await this.hashPassword(input.password);

    // Generate email verification token
    const emailVerificationToken = this.generateToken();

    // Create identity (auth-only, no profile data)
    const now = new Date().toISOString();
    const [identity] = await this.db
      .insert(authIdentity)
      .values({
        email: input.email.toLowerCase(),
        password: hashedPassword,
        emailVerificationToken,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Emit IdentityCreatedEvent - app listens to create UserProfile
    await this.events.dispatch(
      new IdentityCreatedEvent({
        identityId: identity.id,
        email: identity.email,
        initialName: input.name,
      })
    );

    // Queue verification email
    await this.sendVerificationEmail(
      identity.email,
      emailVerificationToken,
      input.name
    );

    // Create session (no org context on registration - Pro handles this)
    const session = await this.sessionService.createSession({
      userId: identity.id,
      currentOrgId: null,
      userAgent,
      ipAddress,
    });

    return {
      user: {
        id: identity.id,
        email: identity.email,
        name: null, // Profile data not in Core
        emailVerified: identity.emailVerified,
      },
      session: {
        token: session.token,
        expiresAt: typeof session.expiresAt === 'string' ? session.expiresAt : session.expiresAt.toISOString(),
      },
    };
  }

  /**
   * Login with email and password
   */
  async login(
    input: LoginInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    // Find identity by email
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.email, input.email.toLowerCase()))
      .limit(1);

    if (!identity) {
      throw new Error('Invalid email or password');
    }

    // Check if identity is banned
    if (identity.isBanned) {
      throw new Error('Account is banned');
    }

    // Check if identity has a password (OAuth-only users)
    if (!identity.password) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(
      input.password,
      identity.password
    );

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Create session (org context handled by Pro layer)
    const session = await this.sessionService.createSession({
      userId: identity.id,
      currentOrgId: null,
      userAgent,
      ipAddress,
    });

    return {
      user: {
        id: identity.id,
        email: identity.email,
        name: null, // Profile data not in Core
        emailVerified: identity.emailVerified,
      },
      session: {
        token: session.token,
        expiresAt: typeof session.expiresAt === 'string' ? session.expiresAt : session.expiresAt.toISOString(),
      },
    };
  }

  /**
   * Queue verification email job
   */
  private async sendVerificationEmail(
    email: string,
    token: string,
    name?: string | null
  ): Promise<void> {
    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const verificationUrl = `${appUrl}/auth/verify-email/${token}`;

    // Queue email job with HIGH priority
    await this.jobService.createJob({
      type: 'send-email',
      payload: {
        to: email,
        template: 'email-verification',
        data: {
          name: name || 'there',
          verificationUrl,
        },
      },
      priority: 'HIGH',
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.emailVerificationToken, input.token))
      .limit(1);

    if (!identity) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if already verified
    if (identity.emailVerified) {
      throw new Error('Email already verified');
    }

    // Verify email
    await this.db
      .update(authIdentity)
      .set({
        emailVerified: new Date().toISOString(),
        emailVerificationToken: null,
      })
      .where(eq(authIdentity.id, identity.id));
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.email, input.email.toLowerCase()))
      .limit(1);

    // Don't reveal if identity exists (security best practice)
    if (!identity) {
      return;
    }

    // Generate reset token
    const token = this.generateToken();
    const expiresAt = new Date(
      Date.now() + (config.auth?.passwordResetTokenExpiryHours ?? 24) * 60 * 60 * 1000
    ).toISOString();

    await this.db
      .update(authIdentity)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiresAt,
      })
      .where(eq(authIdentity.id, identity.id));

    // Queue password reset email (name fetched from profile if needed)
    await this.sendPasswordResetEmail(identity.email, token, null);
  }

  /**
   * Queue password reset email job
   */
  private async sendPasswordResetEmail(
    email: string,
    token: string,
    name?: string | null
  ): Promise<void> {
    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const resetUrl = `${appUrl}/auth/reset-password/${token}`;

    // Queue email job with HIGH priority
    await this.jobService.createJob({
      type: 'send-email',
      payload: {
        to: email,
        template: 'password-reset',
        data: {
          name: name || 'there',
          resetUrl,
        },
      },
      priority: 'HIGH',
    });
  }

  /**
   * Request account deletion — sets grace period and schedules hard-delete job
   */
  async requestAccountDeletion(userId: string): Promise<void> {
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);

    if (!identity) throw new Error('User not found');

    const now = new Date().toISOString();
    await this.db
      .update(authIdentity)
      .set({ deletionRequestedAt: now, updatedAt: now })
      .where(eq(authIdentity.id, userId));

    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const lookupKey = `delete-account:${userId}`;
    const payload: DeleteAccountJobPayload = { userId, email: identity.email };

    await this.jobService.createJob({
      type: DELETE_ACCOUNT_JOB_TYPE,
      payload: payload as unknown as Record<string, unknown>,
      lookupKey,
      scheduledFor,
    });

    await this.sessionService.deleteAllSessions(userId);
  }

  /**
   * Cancel pending account deletion
   */
  async cancelDeletion(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(authIdentity)
      .set({ deletionRequestedAt: null, updatedAt: now })
      .where(eq(authIdentity.id, userId));

    await this.jobService.cancelByLookupKey(`delete-account:${userId}`);
  }

  /**
   * Export user data as a JSON object
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);

    if (!identity) throw new Error('User not found');

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: identity.id,
        email: identity.email,
        emailVerified: identity.emailVerified,
        createdAt: identity.createdAt,
      },
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.passwordResetToken, input.token))
      .limit(1);

    if (!identity) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token expired (D1 stores dates as ISO strings)
    if (!identity.passwordResetExpiry || new Date(identity.passwordResetExpiry) < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate password strength
    if (!this.validatePasswordStrength(input.newPassword)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, and number'
      );
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(input.newPassword);

    // Update password and clear reset token
    await this.db
      .update(authIdentity)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      })
      .where(eq(authIdentity.id, identity.id));

    // Delete all sessions for security (force re-login)
    await this.sessionService.deleteAllSessions(identity.id);
  }
}

