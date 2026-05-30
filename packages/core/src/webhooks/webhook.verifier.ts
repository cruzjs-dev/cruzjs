/**
 * Webhook Verifier
 *
 * Utilities for verifying incoming webhook requests from external providers.
 * Uses HMAC-SHA256 via the Web Crypto API.
 */

import { verifySignature } from './webhook.signer';

/**
 * Verify an incoming webhook request by checking the HMAC signature header.
 *
 * @param request - The incoming Request object
 * @param secret - The shared secret for HMAC verification
 * @param headerName - The header containing the signature (default: 'x-webhook-signature')
 * @returns Object with verified status and the raw payload string
 */
export async function verifyWebhookRequest(
  request: Request,
  secret: string,
  headerName = 'x-webhook-signature',
): Promise<{ verified: boolean; payload: string }> {
  const signature = request.headers.get(headerName);
  if (!signature) {
    return { verified: false, payload: '' };
  }

  const payload = await request.text();
  if (!payload) {
    return { verified: false, payload: '' };
  }

  const verified = await verifySignature(payload, signature, secret);
  return { verified, payload };
}
