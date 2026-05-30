---
title: Encrypted Columns
description: Store sensitive PII fields with transparent AES-256-GCM encryption at rest.
---

CruzJS provides `EncryptedColumn` helpers for encrypting sensitive fields (SSNs, API keys, PII) before storing them in the database. Encryption uses AES-256-GCM via the Web Crypto API, which works natively in Cloudflare Workers.

## Overview

Encrypted values are stored as a JSON string in a standard Drizzle `text` column:

```json
{"e":"base64-ciphertext","iv":"base64-initialization-vector"}
```

Because the Web Crypto API is async, Drizzle's synchronous `customType` hooks cannot be used. Instead, you explicitly encrypt before insert and decrypt after select using the static methods on `EncryptedColumn`.

## Encrypting Before Insert

Use `encryptFields()` to encrypt specified fields on a record before inserting:

```typescript
import { EncryptedColumn } from '@cruzjs/core';

const record = await EncryptedColumn.encryptFields(
  { name: 'Alice Smith', ssn: '123-45-6789', email: 'alice@example.com' },
  ['ssn'],
);

await db.insert(users).values(record);
// record.name = 'Alice Smith' (unchanged)
// record.ssn = '{"e":"...","iv":"..."}' (encrypted)
// record.email = 'alice@example.com' (unchanged)
```

Only the fields listed in the second argument are encrypted. Null or undefined values are left as-is.

## Decrypting After Select

Use `decryptFields()` to restore plaintext values after querying:

```typescript
const [user] = await db.select().from(users).where(eq(users.id, id));

const decrypted = await EncryptedColumn.decryptFields(user, ['ssn']);
// decrypted.ssn = '123-45-6789'
```

## Batch Decryption

For arrays of records, use `decryptMany()`:

```typescript
const rows = await db.select().from(users);
const decryptedRows = await EncryptedColumn.decryptMany(rows, ['ssn']);
```

This runs `decryptFields()` on each record in parallel using `Promise.all`.

## Supported Column Types

Use a standard `text` column in your Drizzle schema for encrypted fields:

```typescript
import { text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  ssn: text('ssn'),          // Encrypted at application level
  apiKey: text('api_key'),   // Encrypted at application level
});
```

There is no special column type -- any `text` column can hold encrypted data.

## Single Value Encryption

For encrypting individual values outside the context of a record:

```typescript
const encrypted = await EncryptedColumn.encrypt('sensitive-value');
// '{"e":"...","iv":"..."}'

const plaintext = await EncryptedColumn.decrypt(encrypted);
// 'sensitive-value'
```

## Important Notes

- **All operations are async.** `encryptFields`, `decryptFields`, `decryptMany`, `encrypt`, and `decrypt` all return Promises. Always `await` them.

- **Set `ENCRYPTION_KEY` in your environment.** The underlying encryption functions read this variable for the AES-256-GCM key.

  ```bash
  ENCRYPTION_KEY=your-32-byte-hex-or-base64-key
  ```

- **Encrypted values cannot be queried with SQL.** You cannot use `WHERE ssn = '123-45-6789'` because the stored value is ciphertext. If you need to search by an encrypted field, store a separate hash column for lookups.

- **Each encryption produces a unique IV.** The same plaintext encrypts to different ciphertext each time, which is the correct behavior for AES-GCM security.

- **Returns shallow copies.** `encryptFields` and `decryptFields` return a new object -- the original is not mutated.
