/**
 * Encrypted Column Helpers — async AES-256-GCM encryption for Drizzle records.
 *
 * Because the Web Crypto API is async, Drizzle's `customType` toDriver/fromDriver
 * (which must be synchronous) cannot be used directly. Instead, this module
 * provides helper functions to encrypt/decrypt field values before insert and
 * after select.
 *
 * Encrypted values are stored as a JSON string: `{"e":"<base64>","iv":"<base64>"}`
 * in a single text column.
 *
 * @example
 * // Before inserting:
 * const record = await EncryptedColumn.encryptFields(
 *   { name: 'Alice', ssn: '123-45-6789' },
 *   ['ssn'],
 * );
 * await db.insert(users).values(record);
 *
 * // After selecting:
 * const rows = await db.select().from(users);
 * const decrypted = await EncryptedColumn.decryptFields(rows[0], ['ssn']);
 */

import { encryptToken, decryptToken } from '../shared/encryption/encryption';

type EncryptedPayload = {
  /** Base64-encoded ciphertext */
  e: string;
  /** Base64-encoded initialization vector */
  iv: string;
};

export class EncryptedColumn {
  /**
   * Encrypt a single plaintext string.
   * Returns a JSON string suitable for storing in a text column.
   */
  static async encrypt(value: string): Promise<string> {
    const { encrypted, iv } = await encryptToken(value);
    const payload: EncryptedPayload = { e: encrypted, iv };
    return JSON.stringify(payload);
  }

  /**
   * Decrypt a single encrypted column value.
   * Expects the JSON format produced by `encrypt()`.
   */
  static async decrypt(value: string): Promise<string> {
    const payload: EncryptedPayload = JSON.parse(value);
    return decryptToken(payload.e, payload.iv);
  }

  /**
   * Encrypt specified fields on a record before inserting into the database.
   *
   * Returns a shallow copy with the specified fields replaced by encrypted values.
   * Null/undefined fields are left as-is.
   */
  static async encryptFields<T extends Record<string, unknown>>(
    record: T,
    fields: (keyof T)[],
  ): Promise<T> {
    const copy = { ...record };
    for (const field of fields) {
      const value = copy[field];
      if (value != null && typeof value === 'string') {
        (copy as Record<string, unknown>)[field as string] =
          await EncryptedColumn.encrypt(value);
      }
    }
    return copy;
  }

  /**
   * Decrypt specified fields on a record after selecting from the database.
   *
   * Returns a shallow copy with the specified fields decrypted.
   * Null/undefined fields are left as-is.
   */
  static async decryptFields<T extends Record<string, unknown>>(
    record: T,
    fields: (keyof T)[],
  ): Promise<T> {
    const copy = { ...record };
    for (const field of fields) {
      const value = copy[field];
      if (value != null && typeof value === 'string') {
        (copy as Record<string, unknown>)[field as string] =
          await EncryptedColumn.decrypt(value);
      }
    }
    return copy;
  }

  /**
   * Decrypt specified fields on an array of records.
   *
   * Convenience wrapper over `decryptFields` for query result sets.
   */
  static async decryptMany<T extends Record<string, unknown>>(
    records: T[],
    fields: (keyof T)[],
  ): Promise<T[]> {
    return Promise.all(
      records.map((record) => EncryptedColumn.decryptFields(record, fields)),
    );
  }
}
