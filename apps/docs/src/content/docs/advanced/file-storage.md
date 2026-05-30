---
title: File Storage
description: Store and retrieve files with CruzJS's StorageService — an abstraction over R2, S3, GCS, Azure Blob, Spaces, or local filesystem.
---

CruzJS provides `StorageService`, an injectable facade for file storage backed by the adapter's storage binding — Cloudflare R2 on Cloudflare Workers/Pages, S3 on AWS, GCS on Google Cloud, Blob Storage on Azure, Spaces on DigitalOcean, and a local filesystem driver or S3-compatible endpoint (e.g., MinIO) on Docker. In local development, a local filesystem driver is used automatically.

## Storage Drivers

| Driver | Backend | When Used |
|--------|---------|-----------|
| `R2StorageDriver` | Cloudflare R2 | Cloudflare adapter |
| `S3StorageDriver` | AWS S3 | AWS adapter |
| `GCSStorageDriver` | Google Cloud Storage | GCP adapter |
| `AzureBlobStorageDriver` | Azure Blob Storage | Azure adapter |
| `SpacesStorageDriver` | DigitalOcean Spaces | DigitalOcean adapter |
| `LocalStorageDriver` | Local filesystem | Development / Docker (no S3) |

The active driver is determined by the `STORAGE_DRIVER` environment variable (defaults to `r2`). When set to `r2` but R2 is not available (e.g., running without wrangler), the service automatically falls back to the local driver.

## The StorageDriver Interface

All storage drivers implement a common interface:

```typescript
type StorageDriver = {
  put(key: string, content: Buffer | string, options?: PutOptions): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
  } | null>;
  url(key: string): Promise<string>;
  signedUrl(key: string, expiresIn?: number): Promise<string>;
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    maxSize: number,
    expiresIn?: number,
  ): Promise<{ url: string; expiresAt: Date }>;
};
```

## Using StorageService

Inject `StorageService` and call `.disk()` to get the active storage driver:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { StorageService } from '@cruzjs/core/shared/storage/storage.service.server';

@Injectable()
export class DocumentService {
  constructor(
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async saveDocument(userId: string, content: Buffer, fileName: string) {
    const key = `documents/${userId}/${Date.now()}-${fileName}`;
    const driver = this.storage.disk();

    await driver.put(key, content, {
      contentType: 'application/pdf',
      metadata: { uploadedBy: userId },
    });

    return key;
  }
}
```

### Uploading Files

```typescript
// Upload from a Buffer
const key = await driver.put('reports/q4-summary.pdf', pdfBuffer, {
  contentType: 'application/pdf',
});

// Upload from a string
await driver.put('config/settings.json', JSON.stringify(settings), {
  contentType: 'application/json',
});
```

### Downloading Files

```typescript
// Get file content as a Buffer
const content = await driver.get('reports/q4-summary.pdf');

// Check if file exists before downloading
if (await driver.exists(key)) {
  const data = await driver.get(key);
  // process data...
}
```

### Deleting Files

```typescript
await driver.delete('reports/old-report.pdf');
```

### Getting File Metadata

```typescript
const metadata = await driver.getMetadata('reports/q4-summary.pdf');
if (metadata) {
  console.log(`Size: ${metadata.size} bytes`);
  console.log(`Type: ${metadata.contentType}`);
  console.log(`Modified: ${metadata.lastModified}`);
  console.log(`ETag: ${metadata.etag}`);
}
```

### Generating URLs

```typescript
// Public URL (requires public bucket)
const publicUrl = await driver.url('images/logo.png');

// Signed URL for temporary access (default: 15 minutes)
const signedUrl = await driver.signedUrl('documents/invoice.pdf');

// Signed URL with custom expiration (1 hour)
const signedUrl = await driver.signedUrl('documents/invoice.pdf', 3600);
```

### Presigned Upload URLs

Generate a presigned URL so clients can upload directly to R2 without going through your server:

```typescript
const { url, expiresAt } = await driver.getPresignedUploadUrl(
  'uploads/user-123/photo.jpg',  // storage key
  'image/jpeg',                   // content type
  5 * 1024 * 1024,               // max size: 5MB
  900,                            // expires in 15 minutes
);

// Return the URL to the client
return { uploadUrl: url, expiresAt };
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_DRIVER` | Storage backend (`r2` or `local`) | `r2` |
| `R2_BUCKET` | R2 bucket name | `uploads` |

### Wrangler Configuration

Bind your R2 bucket in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "my-app-uploads"
```

The `CloudflareContext` looks for the `UPLOADS_BUCKET` or `STORAGE` binding name when accessing R2.

### Creating R2 Buckets

Use the CLI to create R2 buckets:

```bash
# Create a bucket
cruz r2 create my-app-uploads

# List buckets
cruz r2 list
```

## Local Development

When running locally without wrangler, the `LocalStorageDriver` stores files on the local filesystem. Files are written to a `storage/` directory in your project root. This happens automatically — no configuration is needed.

The local driver implements the same interface as R2, so your code works identically in both environments. Presigned URLs in local mode point to `localhost`.

## Best Practices

1. **Use meaningful storage keys.** Organize files with path-like keys: `uploads/{userId}/{timestamp}-{filename}`. This makes browsing R2 in the Cloudflare dashboard intuitive.

2. **Always specify content types.** Set the `contentType` option when uploading. This ensures files are served with the correct MIME type when downloaded.

3. **Use presigned URLs for client uploads.** Do not proxy large file uploads through your application. Generate a presigned URL and let the client upload directly to R2.

4. **Check existence before downloading.** Call `exists()` before `get()` to avoid exceptions on missing files.

5. **Clean up orphaned files.** When deleting database records that reference stored files, delete the corresponding storage objects to avoid accumulating orphaned data.
