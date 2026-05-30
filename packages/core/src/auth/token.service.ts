import { ConfigService } from '../shared/config/config.service';
import crypto from 'crypto';
import { inject, injectable } from 'inversify';
import jwt from 'jsonwebtoken';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { refreshTokens } from '../database/schema';
import { eq, and, lt } from 'drizzle-orm';
import type { TokenPayload } from './auth.models';
import { hashSessionToken } from './session.utils';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

/**
 * Token service for managing JWT and refresh tokens
 */
@injectable()
export class TokenService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(ConfigService) private readonly configService: ConfigService
  ) {}

  /**
   * Generate JWT access token
   * @param userId - User ID to encode in token
   * @returns JWT access token string
   */
  generateAccessToken(userId: string): string {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    return jwt.sign({ userId }, jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token and store in database
   * @param userId - User ID to associate token with
   * @returns Plain refresh token (must be returned to client, then hashed for storage)
   */
  async generateRefreshToken(userId: string): Promise<string> {
    // Generate secure random token (32 bytes, hex encoded)
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashSessionToken(token);

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // Store hashed token in database (D1 uses ISO strings)
    await this.db.insert(refreshTokens).values({
      token: hashedToken,
      userId,
      expiresAt: expiresAt.toISOString(),
    });

    return token;
  }

  /**
   * Verify JWT access token
   * @param token - JWT token to verify
   * @returns Decoded token payload or null if invalid
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
      const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token from database
   * @param token - Plain refresh token
   * @returns User ID if valid, null if invalid or expired
   */
  async verifyRefreshToken(token: string): Promise<string | null> {
    const hashedToken = hashSessionToken(token);

    // Find token in database
    const [refreshToken] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, hashedToken))
      .limit(1);

    if (!refreshToken) {
      return null;
    }

    // Check if expired (D1 stores dates as ISO strings)
    if (new Date(refreshToken.expiresAt) < new Date()) {
      // Delete expired token
      await this.db.delete(refreshTokens).where(eq(refreshTokens.id, refreshToken.id));
      return null;
    }

    return refreshToken.userId;
  }

  /**
   * Revoke a refresh token
   * @param token - Plain refresh token to revoke
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const hashedToken = hashSessionToken(token);

    await this.db.delete(refreshTokens).where(eq(refreshTokens.token, hashedToken));
  }

  /**
   * Revoke all refresh tokens for a user
   * @param userId - User ID to revoke all tokens for
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  /**
   * Clean up expired refresh tokens
   * Called periodically to remove expired tokens from database
   */
  async cleanupExpiredRefreshTokens(): Promise<number> {
    // D1 uses ISO strings for dates, which sort correctly as strings
    await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date().toISOString()));

    // D1 doesn't return rowCount, return 0 (could query count first if needed)
    return 0;
  }
}
