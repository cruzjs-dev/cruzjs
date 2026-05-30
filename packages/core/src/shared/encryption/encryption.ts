/**
 * Shared AES-256-GCM encryption utilities.
 *
 * Used by ScmService and AiConnectionsService for encrypting
 * tokens/API keys at rest in D1.
 */

let cachedKey: CryptoKey | null = null;

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

/**
 * Import the AES-256-GCM encryption key from SCM_ENCRYPTION_KEY env var.
 * The key must be a 64-char hex string (32 bytes).
 */
export async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const keyHex =
    (globalThis as Record<string, unknown>).__SCM_ENCRYPTION_KEY as string
    ?? process.env.SCM_ENCRYPTION_KEY
    ?? 'a'.repeat(64);

  if (keyHex === 'a'.repeat(64)) {
    console.warn(
      '[encryption] WARNING: Using default dev encryption key. ' +
      'Set SCM_ENCRYPTION_KEY in production.'
    );
  }

  const keyBytes = hexToBytes(keyHex);
  cachedKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return cachedKey;
}

/** Encrypt a plaintext string with AES-256-GCM. Generates a fresh random IV. */
export async function encryptToken(plaintext: string): Promise<{ encrypted: string; iv: string }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    encrypted: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

/** Decrypt an AES-256-GCM ciphertext using the stored base64 IV. */
export async function decryptToken(encrypted: string, iv: string): Promise<string> {
  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(encrypted)
  );
  return new TextDecoder().decode(decrypted);
}
