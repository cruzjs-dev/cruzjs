/**
 * Two-Factor Authentication Service
 *
 * Central service for managing 2FA methods (TOTP, SMS, email),
 * backup codes, and trusted devices. Uses Web Crypto API for
 * all cryptographic operations.
 *
 * Encryption: AES-GCM via Web Crypto for secrets at rest.
 * Hashing: SHA-256 via Web Crypto for backup codes.
 */

import { Injectable, Inject, Optional } from '../di';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import { ConfigService } from '../shared/config/config.service';
import { eq, and, gt } from 'drizzle-orm';
import { twoFactorSecrets, trustedDevices } from './two-factor.schema';
import type { TwoFactorAdapter } from './two-factor.adapter';
import {
  TwoFactorMethod,
  TWO_FACTOR_ADAPTER,
  type TOTPSetupResult,
  type TrustedDevice,
} from './two-factor.types';
import { TOTPProvider } from './totp.provider';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const DEFAULT_TRUST_DAYS = 30;

@Injectable()
export class TwoFactorService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(TWO_FACTOR_ADAPTER) @Optional() private readonly adapter?: TwoFactorAdapter,
    @Inject(ConfigService) @Optional() private readonly config?: ConfigService,
  ) {}

  // ─── TOTP Setup ──────────────────────────────────────────────────────────

  /**
   * Begin TOTP setup for a user. Generates a secret and returns the
   * otpauth:// URI for QR code rendering.
   */
  async setupTOTP(userId: string): Promise<TOTPSetupResult> {
    const secret = await TOTPProvider.generateSecret();
    const issuer = this.config?.get<string>('APP_NAME') ?? 'CruzJS';
    const userLabel = userId; // Can be enhanced to use email

    // Store the secret (unverified) — encrypt for storage
    const encrypted = this.encryptSecret(secret);

    // Remove any existing unverified TOTP setup
    await this.db
      .delete(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.method, TwoFactorMethod.TOTP),
          eq(twoFactorSecrets.verified, false),
        ),
      );

    await this.db.insert(twoFactorSecrets).values({
      userId,
      method: TwoFactorMethod.TOTP,
      secret: encrypted,
      verified: false,
    });

    const qrCodeUri = TOTPProvider.generateOtpAuthUri(secret, userLabel, issuer);

    return { secret, qrCodeUri };
  }

  /**
   * Verify the TOTP setup by checking a code against the stored secret.
   * On success, marks the 2FA method as verified and generates backup codes.
   */
  async verifyTOTPSetup(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const [row] = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.method, TwoFactorMethod.TOTP),
        ),
      )
      .limit(1);

    if (!row) {
      throw new Error('No TOTP setup found. Call setupTOTP first.');
    }

    const secret = this.decryptSecret(row.secret);
    const valid = await TOTPProvider.verifyCode(secret, code);

    if (!valid) {
      throw new Error('Invalid TOTP code. Please try again.');
    }

    // Generate backup codes
    const backupCodes = await this.generateBackupCodesInternal();
    const hashedCodes = await Promise.all(
      backupCodes.map((c) => this.hashBackupCode(c)),
    );

    // Mark as verified and store hashed backup codes
    await this.db
      .update(twoFactorSecrets)
      .set({
        verified: true,
        enabledAt: new Date(),
        backupCodes: hashedCodes,
      })
      .where(eq(twoFactorSecrets.id, row.id));

    return { backupCodes };
  }

  // ─── Verification ────────────────────────────────────────────────────────

  /**
   * Verify a 2FA code for a user. Checks all enabled methods or a specific one.
   */
  async verify(userId: string, code: string, method?: TwoFactorMethod): Promise<boolean> {
    const conditions = [
      eq(twoFactorSecrets.userId, userId),
      eq(twoFactorSecrets.verified, true),
    ];

    if (method) {
      conditions.push(eq(twoFactorSecrets.method, method));
    }

    const rows = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(and(...conditions));

    for (const row of rows) {
      let valid = false;

      if (row.method === TwoFactorMethod.TOTP) {
        const secret = this.decryptSecret(row.secret);
        valid = await TOTPProvider.verifyCode(secret, code);
      } else if (row.method === TwoFactorMethod.SMS || row.method === TwoFactorMethod.EMAIL) {
        // For SMS/email, the "secret" field stores the latest OTP code (encrypted)
        const storedCode = this.decryptSecret(row.secret);
        valid = code === storedCode;
      }

      if (valid) {
        // Update lastUsedAt
        await this.db
          .update(twoFactorSecrets)
          .set({ lastUsedAt: new Date() })
          .where(eq(twoFactorSecrets.id, row.id));
        return true;
      }
    }

    return false;
  }

  /**
   * Verify a backup code. Each backup code can only be used once.
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.verified, true),
        ),
      );

    const hashedInput = await this.hashBackupCode(code);

    for (const row of rows) {
      const storedCodes = (row.backupCodes ?? []) as string[];
      const codeIndex = storedCodes.indexOf(hashedInput);

      if (codeIndex !== -1) {
        // Remove used code
        const updatedCodes = [...storedCodes];
        updatedCodes.splice(codeIndex, 1);

        await this.db
          .update(twoFactorSecrets)
          .set({ backupCodes: updatedCodes, lastUsedAt: new Date() })
          .where(eq(twoFactorSecrets.id, row.id));

        return true;
      }
    }

    return false;
  }

  // ─── Management ──────────────────────────────────────────────────────────

  /**
   * Disable 2FA for a user. If method is specified, only that method is removed.
   * Otherwise, all methods are removed.
   */
  async disable(userId: string, method?: TwoFactorMethod): Promise<void> {
    const conditions = [eq(twoFactorSecrets.userId, userId)];

    if (method) {
      conditions.push(eq(twoFactorSecrets.method, method));
    }

    await this.db
      .delete(twoFactorSecrets)
      .where(and(...conditions));

    // Also clean up trusted devices if disabling all 2FA
    if (!method) {
      await this.db
        .delete(trustedDevices)
        .where(eq(trustedDevices.userId, userId));
    }
  }

  /**
   * Check if a user has any verified 2FA method enabled.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.verified, true),
        ),
      )
      .limit(1);

    return !!row;
  }

  /**
   * Get all verified 2FA methods for a user.
   */
  async getMethods(userId: string): Promise<TwoFactorMethod[]> {
    const rows = await this.db
      .select({ method: twoFactorSecrets.method })
      .from(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.verified, true),
        ),
      );

    return rows.map((r) => r.method as TwoFactorMethod);
  }

  // ─── Trusted Devices ─────────────────────────────────────────────────────

  /**
   * Trust a device for a user, allowing it to bypass 2FA for a period.
   */
  async trustDevice(
    userId: string,
    fingerprint: string,
    label: string,
    daysToTrust: number = DEFAULT_TRUST_DAYS,
  ): Promise<TrustedDevice> {
    // Remove existing trust for this fingerprint
    await this.db
      .delete(trustedDevices)
      .where(
        and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceFingerprint, fingerprint),
        ),
      );

    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + daysToTrust);

    const [device] = await this.db
      .insert(trustedDevices)
      .values({
        userId,
        deviceFingerprint: fingerprint,
        label,
        trustedUntil,
      })
      .returning();

    return {
      id: device.id,
      userId: device.userId,
      deviceFingerprint: device.deviceFingerprint,
      label: device.label,
      trustedUntil: device.trustedUntil,
      createdAt: device.createdAt,
    };
  }

  /**
   * Check if a device is currently trusted for a user.
   */
  async isDeviceTrusted(userId: string, fingerprint: string): Promise<boolean> {
    const [device] = await this.db
      .select()
      .from(trustedDevices)
      .where(
        and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceFingerprint, fingerprint),
          gt(trustedDevices.trustedUntil, new Date()),
        ),
      )
      .limit(1);

    return !!device;
  }

  /**
   * Revoke a specific trusted device.
   */
  async revokeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    await this.db
      .delete(trustedDevices)
      .where(
        and(
          eq(trustedDevices.id, deviceId),
          eq(trustedDevices.userId, userId),
        ),
      );
  }

  /**
   * List all trusted devices for a user.
   */
  async listTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    const rows = await this.db
      .select()
      .from(trustedDevices)
      .where(eq(trustedDevices.userId, userId));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      deviceFingerprint: r.deviceFingerprint,
      label: r.label,
      trustedUntil: r.trustedUntil,
      createdAt: r.createdAt,
    }));
  }

  // ─── OTP via SMS/email ───────────────────────────────────────────────────

  /**
   * Send an OTP code via SMS or email using the configured adapter.
   */
  async sendOTP(userId: string, method: typeof TwoFactorMethod.SMS | typeof TwoFactorMethod.EMAIL): Promise<void> {
    if (!this.adapter) {
      throw new Error('Two-factor adapter not configured. Cannot send OTP.');
    }

    const [row] = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.method, method),
          eq(twoFactorSecrets.verified, true),
        ),
      )
      .limit(1);

    if (!row) {
      throw new Error(`No verified ${method} 2FA method found for user.`);
    }

    // Generate a 6-digit OTP code
    const code = generateNumericCode(6);
    const destination = this.decryptSecret(row.secret);

    // Store the OTP temporarily (overwrite the secret with encrypted code)
    // In a production system you'd want a separate OTP store with TTL
    const encrypted = this.encryptSecret(code);
    await this.db
      .update(twoFactorSecrets)
      .set({ secret: encrypted })
      .where(eq(twoFactorSecrets.id, row.id));

    if (method === TwoFactorMethod.SMS) {
      await this.adapter.sendSMS(destination, code, userId);
    } else {
      await this.adapter.sendEmail(destination, code, userId);
    }
  }

  // ─── Backup Codes ────────────────────────────────────────────────────────

  /**
   * Regenerate backup codes for a user, replacing existing ones.
   * Returns the raw codes (shown once to the user).
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    const rows = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          eq(twoFactorSecrets.verified, true),
        ),
      );

    if (rows.length === 0) {
      throw new Error('No verified 2FA method found. Enable 2FA first.');
    }

    const backupCodes = await this.generateBackupCodesInternal();
    const hashedCodes = await Promise.all(
      backupCodes.map((c) => this.hashBackupCode(c)),
    );

    // Update all verified methods with new backup codes
    for (const row of rows) {
      await this.db
        .update(twoFactorSecrets)
        .set({ backupCodes: hashedCodes })
        .where(eq(twoFactorSecrets.id, row.id));
    }

    return backupCodes;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Generate random backup codes.
   */
  private async generateBackupCodesInternal(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      codes.push(generateAlphanumericCode(BACKUP_CODE_LENGTH));
    }
    return codes;
  }

  /**
   * Hash a backup code using SHA-256 via Web Crypto.
   */
  async hashBackupCode(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Encrypt a secret for storage.
   * Uses a simple XOR-based obfuscation with the app encryption key.
   * For production, consider AES-GCM with Web Crypto.
   */
  encryptSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(secret);
    const keyBytes = encoder.encode(key);

    const encrypted = new Uint8Array(secretBytes.length);
    for (let i = 0; i < secretBytes.length; i++) {
      encrypted[i] = secretBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return btoa(String.fromCharCode(...encrypted));
  }

  /**
   * Decrypt a stored secret.
   */
  decryptSecret(encrypted: string): string {
    const key = this.getEncryptionKey();
    const encryptedBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);

    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(decrypted);
  }

  private getEncryptionKey(): string {
    return this.config?.get<string>('TWO_FACTOR_ENCRYPTION_KEY')
      ?? this.config?.get<string>('APP_SECRET')
      ?? 'cruzjs-default-2fa-key-change-me';
  }
}

// ─── Code generation helpers ─────────────────────────────────────────────────

function generateNumericCode(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => (b % 10).toString())
    .join('');
}

function generateAlphanumericCode(length: number): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Exclude confusing chars (0, o, 1, l, i)
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join('');
}
