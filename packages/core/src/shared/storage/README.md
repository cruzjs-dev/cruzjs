# Storage Service

The Storage Service provides a unified interface for file storage across different backends (S3, local filesystem, etc.).

## Features

- **Unified Interface**: All drivers implement the same `StorageDriver` interface
- **Environment-Based Configuration**: Configure the default driver via environment variables
- **Simple API**: Single method to get the configured storage driver

## Basic Usage

```typescript
import { getAppContainer } from '@/libs/core/framework/application';
import { StorageService } from '@/libs/shared/storage/storage.service';

const container = await getAppContainer();
const storage = container.get<StorageService>(StorageService);

// Get the default driver (configured via STORAGE_DRIVER env var)
const driver = storage.disk();

// Use the driver
await driver.put('path/to/file.jpg', fileBuffer);
const file = await driver.get('path/to/file.jpg');
const url = await driver.url('path/to/file.jpg');
```

## Environment Variable Configuration

### Default Driver

Set the default storage driver:

```env
STORAGE_DRIVER=s3  # or 'local'
```

### S3 Driver Configuration

When `STORAGE_DRIVER=s3`, configure the S3 driver:

```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

For CloudFlare R2, set a custom endpoint:

```env
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=my-r2-bucket
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key
```

### Local Driver Configuration

When `STORAGE_DRIVER=local`, configure the local driver:

```env
STORAGE_PATH=./storage
STORAGE_URL_BASE=http://localhost:3000/storage  # optional
```

## Driver Interface

All drivers implement the `StorageDriver` interface:

```typescript
type StorageDriver = {
  put(key: string, content: Buffer | string, options?: PutOptions): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  url(key: string): Promise<string>;
  signedUrl(key: string, expiresIn?: number): Promise<string>;
  getMetadata(key: string): Promise<Metadata | null>;
  getPresignedUploadUrl(key: string, contentType: string, maxSize: number, expiresIn?: number): Promise<{ url: string; expiresAt: Date }>;
};
```

## Examples

### Uploading a File

```typescript
const container = await getAppContainer();
const storage = container.get<StorageService>(StorageService);
const driver = storage.disk();

// Upload file
const key = await driver.put('uploads/image.jpg', fileBuffer, {
  contentType: 'image/jpeg',
  metadata: { userId: '123' },
});

// Get public URL
const publicUrl = await driver.url(key);
```

### Getting a Presigned Upload URL

```typescript
const container = await getAppContainer();
const storage = container.get<StorageService>(StorageService);
const driver = storage.disk();

const { url, expiresAt } = await driver.getPresignedUploadUrl(
  'uploads/image.jpg',
  'image/jpeg',
  5 * 1024 * 1024, // 5MB max
  900 // 15 minutes
);
```

### Checking if File Exists

```typescript
const container = await getAppContainer();
const storage = container.get<StorageService>(StorageService);
const driver = storage.disk();

const exists = await driver.exists('uploads/image.jpg');
if (exists) {
  const file = await driver.get('uploads/image.jpg');
}
```
