# Encrypted Columns

AES-256-GCM encryption for sensitive fields stored in Drizzle text columns. Uses the Web Crypto API (async).

Located at `packages/core/src/database/encrypted-column.ts`.

## Why Not Drizzle customType?

Drizzle's `customType` `toDriver`/`fromDriver` must be synchronous. The Web Crypto API is async, so encryption/decryption must be done explicitly before insert and after select.

## Storage Format

Encrypted values are stored as a JSON string in a single text column:

```json
{"e":"<base64-ciphertext>","iv":"<base64-iv>"}
```

## API

### EncryptedColumn.encryptFields(record, fields)

Encrypts specified fields before inserting. Returns a shallow copy with encrypted values. Null/undefined fields are left as-is.

```typescript
import { EncryptedColumn } from '@cruzjs/core';

const record = await EncryptedColumn.encryptFields(
  { name: 'Alice', ssn: '123-45-6789', dob: '1990-01-01' },
  ['ssn'],
);
await db.insert(users).values(record);
// record.ssn is now '{"e":"...","iv":"..."}'
```

### EncryptedColumn.decryptFields(record, fields)

Decrypts specified fields after selecting. Returns a shallow copy with plaintext values.

```typescript
const [user] = await db.select().from(users).where(eq(users.id, id));
const decrypted = await EncryptedColumn.decryptFields(user, ['ssn']);
// decrypted.ssn === '123-45-6789'
```

### EncryptedColumn.decryptMany(records, fields)

Convenience wrapper for arrays of records:

```typescript
const rows = await db.select().from(users);
const decrypted = await EncryptedColumn.decryptMany(rows, ['ssn']);
```

### EncryptedColumn.encrypt(value) / EncryptedColumn.decrypt(value)

Low-level single-value encryption/decryption:

```typescript
const encrypted = await EncryptedColumn.encrypt('123-45-6789');
const plaintext = await EncryptedColumn.decrypt(encrypted);
```

## Schema Pattern

Use a standard `text` column for encrypted fields:

```typescript
import { text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ssn: text('ssn'),  // Encrypted at application level
});
```

## Environment

Requires `ENCRYPTION_KEY` environment variable (used by the underlying `encryptToken`/`decryptToken` functions).

## Important Notes

- All operations are **async** (Web Crypto API requirement)
- Encrypted values cannot be queried with SQL WHERE clauses (they are opaque ciphertext)
- Each encryption produces a unique IV, so the same plaintext encrypts to different ciphertext each time
- Use `decryptMany` for batch operations to keep code clean
