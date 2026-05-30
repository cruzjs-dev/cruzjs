---
title: "09 — File Uploads"
description: Attach files to tasks using presigned URLs and the useFileUpload hook.
---

# Chapter 09 — File Uploads

Add file attachments to tasks. Users pick a file, it uploads directly to R2, and the task stores a reference key.

## How uploads work

CruzJS uses a presigned URL flow:
1. Client calls `trpc.upload.requestUpload` with the file name and size
2. Server generates a presigned R2 upload URL (no file data goes through your server)
3. Client uploads directly to R2 using the presigned URL
4. Client calls `trpc.upload.confirmUpload` to mark the upload complete
5. Your code stores the `key` on the task

## Add attachment support to tasks

The `tasks` table already has `attachmentKey text` from the schema in chapter 02. Now wire up the upload flow.

In `packages/core/src/tasks/tasks.trpc.ts`, add:

```typescript
import { UPLOAD_SERVICE, UploadService } from '@cruzjs/core';

// In the router:
attachFile: t.orgProcedure
  .input(z.object({ taskId: z.string(), key: z.string() }))
  .mutation(({ ctx, input }) =>
    this.service.attachFile(input.taskId, ctx.org.id, input.key)
  ),

removeAttachment: t.orgProcedure
  .input(z.object({ taskId: z.string() }))
  .mutation(({ ctx, input }) =>
    this.service.removeAttachment(input.taskId, ctx.org.id)
  ),
```

In `packages/core/src/tasks/tasks.service.ts`:

```typescript
async attachFile(taskId: string, orgId: string, key: string) {
  await this.db.update(tasks)
    .set({ attachmentKey: key, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));
}

async removeAttachment(taskId: string, orgId: string) {
  await this.db.update(tasks)
    .set({ attachmentKey: null, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));
}
```

## The upload UI

Use the `useFileUpload` hook from `@cruzjs/start`:

```typescript
import { useFileUpload } from '@cruzjs/start';

function TaskAttachment({ taskId }: { taskId: string }) {
  const { upload, progress, error } = useFileUpload();
  const attachFile = trpc.tasks.attachFile.useMutation();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { key } = await upload(file);
    await attachFile.mutateAsync({ taskId, key });
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {progress > 0 && progress < 100 && (
        <progress value={progress} max={100} />
      )}
    </div>
  );
}
```

`useFileUpload` handles the full presigned URL flow internally. You just call `upload(file)` and get back the `key`.

## Display the attachment

```typescript
import { useStorageUrl } from '@cruzjs/start';

function TaskCard({ task }) {
  const attachmentUrl = useStorageUrl(task.attachmentKey);

  return (
    <div>
      <h3>{task.title}</h3>
      {attachmentUrl && (
        <a href={attachmentUrl} target="_blank">Download attachment</a>
      )}
    </div>
  );
}
```

`useStorageUrl(key)` generates a signed download URL from R2. Expired URLs are refreshed automatically.

## Local development

Locally, R2 is simulated by Wrangler's miniflare. Uploads work exactly the same — no special local configuration needed. `cruz dev` handles it.

## What we built

- Presigned URL upload flow with `useFileUpload`
- Stored `attachmentKey` on the task
- Displayed download link with `useStorageUrl`

**Next:** [Chapter 10 — Billing](/tutorial/10-billing/)
