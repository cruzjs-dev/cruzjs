import { Injectable, Inject } from '../../di';
import { ConfigService } from '../config/config.service';

export interface SignedUrlOptions {
  /** Expiry duration: '30m', '1h', '24h', '7d', or seconds as a number. Default: '1h' */
  expiresIn?: string | number;
  /** Extra key-value data embedded in the signature */
  payload?: Record<string, string>;
}

export interface SignedUrlVerification {
  valid: boolean;
  expired?: boolean;
  payload?: Record<string, string>;
  /** The base URL without signature query params */
  url?: string;
}

const SIGNATURE_PARAM = '_signature';
const EXPIRES_PARAM = '_expires';
const PAYLOAD_PARAM = '_payload';

/**
 * Duration string parser.
 * Accepts '30m', '1h', '24h', '7d', or a raw number of seconds.
 */
function parseDuration(input: string | number): number {
  if (typeof input === 'number') return input;

  const match = input.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: "${input}". Use e.g. '30m', '1h', '24h', '7d', or a number of seconds.`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * ArrayBuffer -> URL-safe Base64 (no padding).
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * URL-safe Base64 -> ArrayBuffer.
 */
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Restore padding
  while (base64.length % 4 !== 0) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

/**
 * Timing-safe comparison of two ArrayBuffers.
 */
function timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  if (viewA.byteLength !== viewB.byteLength) return false;
  let result = 0;
  for (let i = 0; i < viewA.byteLength; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  return result === 0;
}

/**
 * Generic signed URL service.
 *
 * Generates tamper-proof, time-limited signed URLs using HMAC-SHA256
 * via the Web Crypto API (works in Cloudflare Workers, no Node.js needed).
 *
 * Use cases: file downloads, email confirmations, password resets,
 * one-click actions, shareable links, etc.
 */
@Injectable()
export class SignedUrlService {
  private cachedKey: CryptoKey | null = null;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /**
   * Sign a URL by appending `_signature`, `_expires`, and optionally `_payload` query params.
   */
  async sign(url: string, options?: SignedUrlOptions): Promise<string> {
    const expiresIn = options?.expiresIn ?? '1h';
    const ttlSeconds = parseDuration(expiresIn);
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

    const parsed = new URL(url);

    // Remove any existing signature params to allow re-signing
    parsed.searchParams.delete(SIGNATURE_PARAM);
    parsed.searchParams.delete(EXPIRES_PARAM);
    parsed.searchParams.delete(PAYLOAD_PARAM);

    // Set expiry
    parsed.searchParams.set(EXPIRES_PARAM, String(expiresAt));

    // Set payload if provided
    if (options?.payload && Object.keys(options.payload).length > 0) {
      parsed.searchParams.set(PAYLOAD_PARAM, JSON.stringify(options.payload));
    }

    // Build signing input: the full URL (without signature param) determines what's signed
    const signingInput = this.getSigningInput(parsed);
    const signature = await this.computeHmac(signingInput);

    parsed.searchParams.set(SIGNATURE_PARAM, signature);

    return parsed.toString();
  }

  /**
   * Verify a signed URL.
   * Returns `{ valid: true, payload, url }` on success, or `{ valid: false, expired }` on failure.
   */
  async verify(url: string): Promise<SignedUrlVerification> {
    try {
      const parsed = new URL(url);

      const signature = parsed.searchParams.get(SIGNATURE_PARAM);
      const expiresAtStr = parsed.searchParams.get(EXPIRES_PARAM);

      if (!signature || !expiresAtStr) {
        return { valid: false };
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt)) {
        return { valid: false };
      }

      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (now > expiresAt) {
        return { valid: false, expired: true };
      }

      // Recompute signature without the _signature param
      const withoutSig = new URL(url);
      withoutSig.searchParams.delete(SIGNATURE_PARAM);
      const signingInput = this.getSigningInput(withoutSig);
      const expectedSignature = await this.computeHmac(signingInput);

      // Timing-safe comparison
      const expectedBytes = base64UrlToArrayBuffer(expectedSignature);
      const actualBytes = base64UrlToArrayBuffer(signature);
      if (!timingSafeEqual(expectedBytes, actualBytes)) {
        return { valid: false };
      }

      // Extract payload
      const payloadStr = parsed.searchParams.get(PAYLOAD_PARAM);
      let payload: Record<string, string> | undefined;
      if (payloadStr) {
        try {
          payload = JSON.parse(payloadStr);
        } catch {
          return { valid: false };
        }
      }

      // Build clean URL (without signature params)
      const cleanUrl = new URL(url);
      cleanUrl.searchParams.delete(SIGNATURE_PARAM);
      cleanUrl.searchParams.delete(EXPIRES_PARAM);
      cleanUrl.searchParams.delete(PAYLOAD_PARAM);

      return {
        valid: true,
        payload,
        url: cleanUrl.toString(),
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Convenience: returns true if the signed URL is currently valid.
   */
  async isValid(url: string): Promise<boolean> {
    const result = await this.verify(url);
    return result.valid;
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Build the string that gets HMAC-signed.
   * Uses the full URL string (with _expires and _payload params, but without _signature).
   */
  private getSigningInput(parsed: URL): string {
    // Sort params for deterministic ordering
    parsed.searchParams.sort();
    return parsed.toString();
  }

  /**
   * Compute HMAC-SHA256 and return as a base64url string.
   */
  private async computeHmac(data: string): Promise<string> {
    const key = await this.getHmacKey();
    const encoded = new TextEncoder().encode(data);
    const signature = await crypto.subtle.sign('HMAC', key, encoded);
    return arrayBufferToBase64Url(signature);
  }

  /**
   * Import (and cache) the HMAC-SHA256 key from environment config.
   * Reads APP_KEY or SIGNED_URL_SECRET.
   */
  private async getHmacKey(): Promise<CryptoKey> {
    if (this.cachedKey) return this.cachedKey;

    const secret =
      this.config.get<string>('SIGNED_URL_SECRET') ??
      this.config.get<string>('APP_KEY');

    if (!secret) {
      throw new Error(
        'SignedUrlService requires SIGNED_URL_SECRET or APP_KEY to be set in the environment.',
      );
    }

    const keyData = new TextEncoder().encode(secret);
    this.cachedKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );

    return this.cachedKey;
  }
}
