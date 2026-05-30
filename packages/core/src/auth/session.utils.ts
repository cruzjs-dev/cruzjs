import crypto from 'crypto';

/**
 * Generate a secure random session token
 * @returns 32-byte token encoded as hex (64 characters)
 */
export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a session token for storage
 * Uses SHA-256 for fast hashing (sessions are already secure tokens)
 */
export const hashSessionToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Compare a plain token with a hashed token
 */
export const compareSessionToken = (token: string, hash: string): boolean => {
  const tokenHash = hashSessionToken(token);
  return crypto.timingSafeEqual(
    new Uint8Array(Buffer.from(tokenHash)),
    new Uint8Array(Buffer.from(hash))
  );
};

