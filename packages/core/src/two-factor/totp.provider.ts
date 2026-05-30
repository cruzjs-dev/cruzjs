/**
 * TOTP Provider
 *
 * Pure TOTP (RFC 6238) implementation using the Web Crypto API.
 * No Node.js crypto — compatible with Cloudflare Workers, Deno, and browsers.
 *
 * Algorithm:
 * 1. Divide current Unix time by time step (default 30s) to get counter
 * 2. HMAC-SHA1(secret, counter) → 20-byte hash
 * 3. Dynamic truncation → 6-digit code
 */

// ─── Base32 Encoding/Decoding ────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(encoded: string): Uint8Array<ArrayBuffer> {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  const output: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

// ─── HMAC-SHA1 via Web Crypto ────────────────────────────────────────────────

async function hmacSha1(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

// ─── Counter helpers ─────────────────────────────────────────────────────────

function intToBytes(num: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(8);
  // Write as big-endian 64-bit integer
  // JavaScript numbers are safe up to 2^53, plenty for Unix timestamps / 30
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

// ─── TOTP Provider ───────────────────────────────────────────────────────────

export class TOTPProvider {
  private static readonly DEFAULT_TIME_STEP = 30;
  private static readonly DEFAULT_DIGITS = 6;
  private static readonly DEFAULT_WINDOW = 1;

  /**
   * Generate a random base32-encoded secret (160 bits / 20 bytes).
   * Uses Web Crypto API for cryptographically secure randomness.
   */
  static async generateSecret(): Promise<string> {
    const buffer = new Uint8Array(20);
    crypto.getRandomValues(buffer);
    return base32Encode(buffer);
  }

  /**
   * Generate a TOTP code for the current time window.
   *
   * @param secret - Base32-encoded secret
   * @param timeStep - Time step in seconds (default 30)
   * @returns 6-digit TOTP code as a zero-padded string
   */
  static async generateCode(secret: string, timeStep: number = TOTPProvider.DEFAULT_TIME_STEP): Promise<string> {
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    return TOTPProvider.generateCodeForCounter(secret, counter);
  }

  /**
   * Verify a TOTP code, checking the current window and adjacent windows
   * to account for clock skew.
   *
   * @param secret - Base32-encoded secret
   * @param code - 6-digit code to verify
   * @param window - Number of adjacent windows to check (default 1 = current +/- 1)
   * @returns true if the code is valid
   */
  static async verifyCode(
    secret: string,
    code: string,
    window: number = TOTPProvider.DEFAULT_WINDOW,
  ): Promise<boolean> {
    const timeStep = TOTPProvider.DEFAULT_TIME_STEP;
    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i;
      const expected = await TOTPProvider.generateCodeForCounter(secret, counter);
      if (timingSafeEqual(code, expected)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate an otpauth:// URI suitable for QR codes.
   *
   * @param secret - Base32-encoded secret
   * @param label - User-facing label (e.g., "user@example.com")
   * @param issuer - Application name (e.g., "MyCruzApp")
   * @returns otpauth:// URI string
   */
  static generateOtpAuthUri(secret: string, label: string, issuer: string): string {
    const encodedLabel = encodeURIComponent(label);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /**
   * Generate a TOTP code for a specific counter value.
   */
  private static async generateCodeForCounter(secret: string, counter: number): Promise<string> {
    const keyBytes = base32Decode(secret);
    const counterBytes = intToBytes(counter);
    const hash = await hmacSha1(keyBytes, counterBytes);

    // Dynamic truncation (RFC 4226 section 5.4)
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 10 ** TOTPProvider.DEFAULT_DIGITS;
    return otp.toString().padStart(TOTPProvider.DEFAULT_DIGITS, '0');
  }
}

// ─── Timing-safe comparison ──────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 * Both strings must be the same length for meaningful comparison.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Export utilities for testing
export { base32Encode, base32Decode, timingSafeEqual };
