/**
 * Webhook Signer
 *
 * HMAC-SHA256 signing and verification using the Web Crypto API.
 * Compatible with Cloudflare Workers, Node 18+, and all modern runtimes.
 */

/**
 * Sign a payload string with an HMAC-SHA256 signature.
 * Returns the signature as a hex string.
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bufferToHex(signature);
}

/**
 * Verify an HMAC-SHA256 signature against a payload and secret.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = hexToBuffer(signature);
  } catch {
    return false;
  }

  return crypto.subtle.verify('HMAC', key, signatureBytes as unknown as ArrayBuffer, encoder.encode(payload) as unknown as ArrayBuffer);
}

/**
 * Generate a cryptographically secure random secret.
 * Returns a 64-character hex string (32 bytes of entropy).
 */
export function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

// ── Helpers ─────────────────────────────────────────────────────────

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
