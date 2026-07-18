---
title: File Uploads
description: Handle file uploads in CruzJS with presigned URLs, file validation, upload tracking, and built-in upload types for avatars, documents, images, and more.
---

CruzJS provides a complete upload system built on top of the [StorageService](/advanced/file-storage/). It handles presigned URL generation, file validation (type and size), upload status tracking, and cleanup of failed uploads.

## Upload Flow

```
1. Client requests upload URL
        │
        ▼
2. Server validates file (type, size)
        │
        ▼
3. Server generates presigned URL + creates upload record (PENDING)
        │
        ▼
4. Client uploads file directly to R2 via presigned URL
        │
        ▼
5. Client confirms upload
        │
        ▼
6. Server verifies file in storage, updates status to COMPLETED
```

This two-step flow keeps large files off your server — clients upload directly to R2 using the presigned URL.

## Upload Types and Validation

CruzJS includes built-in validation rules for common upload types:

| Type | Max Size | Allowed Types | Allowed Extensions |
|------|----------|---------------|-------------------|
| `avatar` | 5 MB | JPEG, PNG, WebP, GIF | .jpg, .jpeg, .png, .webp, .gif |
| `document` | 10 MB | PDF, Word, Plain text | .pdf, .doc, .docx, .txt |
| `image` | 10 MB | JPEG, PNG, WebP, GIF | .jpg, .jpeg, .png, .webp, .gif |
| `video` | 100 MB | MP4, WebM, QuickTime | .mp4, .webm, .mov |
| `general` | 50 MB | Any | Any |

These rules can be customized in `cruz.config.ts`:

```typescript
// cruz.config.ts
export default {
  upload: {
    fileValidationRules: {
      avatar: {
        maxSize: 2 * 1024 * 1024,  // 2 MB instead of 5 MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      },
      // ... other types inherit defaults
    },
  },
};
```

## Using UploadService

### Requesting an Upload

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { UploadService } from '@cruzjs/core/upload/upload.service';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(UploadService) private readonly uploadService: UploadService,
  ) {}

  async requestAvatarUpload(userId: string, fileName: string, fileSize: number, contentType: string) {
    const response = await this.uploadService.requestUpload(
      { userId, fileName, fileSize, contentType },
      'avatar',  // upload type for validation
    );

    return {
      uploadId: response.id,
      uploadUrl: response.uploadUrl,   // presigned R2 URL
      key: response.key,               // storage key for confirmation
      expiresAt: response.expiresAt,   // URL expiration
      maxSize: response.maxSize,       // validated max size
    };
  }
}
```

The `requestUpload` method:
1. Validates the file against the upload type rules (size, MIME type, extension)
2. Generates a unique storage key with the pattern `uploads/{userId}/{timestamp}-{random}-{filename}`
3. Creates a presigned upload URL from the storage driver
4. Creates an upload record in D1 with status `PENDING`

### Confirming an Upload

After the client uploads the file to R2, confirm the upload to update its status:

```typescript
async confirmAvatarUpload(uploadId: string, key: string) {
  const upload = await this.uploadService.confirmUpload({ uploadId, key });
  // upload.status is now 'COMPLETED'
  return upload;
}
```

The `confirmUpload` method verifies the file exists in storage, checks the key matches the record, and updates the status to `COMPLETED`.

### Deleting Uploads

```typescript
// Deletes both the storage object and the database record
await this.uploadService.deleteUpload(uploadId);
```

### Listing User Uploads

```typescript
// All uploads for a user
const uploads = await this.uploadService.listUserUploads(userId);

// Only completed uploads
const completed = await this.uploadService.listUserUploads(userId, 'COMPLETED');
```

### Cleanup Failed Uploads

Remove stale `FAILED` uploads older than a specified number of hours:

```typescript
// Clean up uploads that failed more than 24 hours ago
const deletedCount = await this.uploadService.cleanupFailedUploads(24);
```

This is useful as a scheduled job:

```typescript
@Injectable()
export class UploadCleanupHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'upload-cleanup',
    statuses: ['PENDING'],
  };

  constructor(@Inject(UploadService) private uploadService: UploadService) {}

  async run(): Promise<JobResult> {
    const deleted = await this.uploadService.cleanupFailedUploads(24);
    return { success: true, summary: { deletedCount: deleted } };
  }
}
```

## Using Uploads in a tRPC Router

```typescript
import { router, protectedProcedure } from '@cruzjs/core';
import { z } from 'zod';
import { UploadService } from '@cruzjs/core/upload/upload.service';

export const uploadRouter = router({
  requestUpload: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileSize: z.number().positive(),
      contentType: z.string(),
      uploadType: z.enum(['avatar', 'document', 'image', 'video', 'general']).default('general'),
    }))
    .mutation(async ({ ctx, input }) => {
      const uploadService = ctx.container.get(UploadService);

      return uploadService.requestUpload(
        {
          userId: ctx.user.id,
          fileName: input.fileName,
          fileSize: input.fileSize,
          contentType: input.contentType,
        },
        input.uploadType,
      );
    }),

  confirmUpload: protectedProcedure
    .input(z.object({
      uploadId: z.string(),
      key: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const uploadService = ctx.container.get(UploadService);
      return uploadService.confirmUpload(input);
    }),

  deleteUpload: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const uploadService = ctx.container.get(UploadService);
      await uploadService.deleteUpload(input.uploadId);
      return { success: true };
    }),
});
```

## Client-Side Upload Example

```typescript
// In a React component
async function handleFileUpload(file: File) {
  // Step 1: Request upload URL from server
  const { uploadUrl, uploadId, key } = await trpc.upload.requestUpload.mutate({
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    uploadType: 'image',
  });

  // Step 2: Upload directly to R2
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  // Step 3: Confirm the upload
  const upload = await trpc.upload.confirmUpload.mutate({ uploadId, key });
  return upload;
}
```

## Upload Data Model

Each upload is tracked in D1 with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique upload ID |
| `userId` | string | Owner of the upload |
| `filename` | string | Sanitized filename in storage |
| `originalFilename` | string | Original filename from user |
| `size` | number | File size in bytes |
| `mimeType` | string | MIME content type |
| `bucket` | string | R2 bucket name |
| `key` | string | Full storage key |
| `status` | string | PENDING, UPLOADING, COMPLETED, FAILED |
| `url` | string? | Public URL (if bucket is public) |
| `uploadedAt` | string? | When upload was completed |
| `createdAt` | string | When record was created |

## Best Practices

1. **Always validate on the server.** Even though client-side validation improves UX, the server must enforce file type and size limits. The `UploadService` validates before generating presigned URLs.

2. **Use upload types.** Specify the appropriate upload type (`avatar`, `document`, `image`, etc.) to get automatic validation rules. Define custom types in `cruz.config.ts` for domain-specific needs.

3. **Clean up failed uploads.** Run the cleanup job periodically to remove `PENDING` and `FAILED` uploads that are older than 24 hours. This prevents orphaned storage objects.

4. **Confirm uploads after client upload.** Always call `confirmUpload` after the client finishes uploading. This verifies the file actually exists in storage and updates the database record.

5. **Delete storage when deleting records.** The `deleteUpload` method handles both the storage object and the database record. If you delete records manually, remember to also delete the corresponding R2 object.
