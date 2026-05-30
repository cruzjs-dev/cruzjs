# Phase 4 — Ops & Storage

Production safety and storage completeness. These are things that bite you in production, not during development.

**Read before starting:** `.claude/kb/13-DEPLOYMENT.md`, `packages/core/src/upload/upload.service.ts`, `packages/cli/src/commands/db.command.ts`

---

## P4.1 — Image Transformations

**Goal:** `StorageService.transform(key, options)` that returns a URL or `ArrayBuffer` for a resized/cropped/converted version of an uploaded image. Uses Cloudflare Images or Workers-based sharp (if not on Cloudflare).

**Why it matters:** User avatars, product images, thumbnails — every app needs image processing. Currently uploads are stored as-is. Serving 4MB originals as profile pictures is unacceptable in production.

**Files to touch:**
- `packages/core/src/upload/image-transform.service.ts` — new file
- `packages/core/src/upload/upload.service.ts` — add `withTransforms()` option to `requestUpload`
- `packages/core/src/upload/upload.types.ts` — add `ImageTransformOptions` type
- `packages/core/src/upload/upload.module.ts` — register `ImageTransformService`
- `packages/adapter-cloudflare/src/images.ts` — Cloudflare Images adapter
- `packages/adapter-docker/src/images.ts` — local sharp adapter (for self-hosted)
- `packages/core/src/upload/index.ts` — export new types

**Implementation steps:**

1. **`ImageTransformOptions` type:**
   ```typescript
   export interface ImageTransformOptions {
     width?: number;
     height?: number;
     fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
     format?: 'webp' | 'jpeg' | 'png' | 'avif';
     quality?: number;  // 1-100
   }
   ```

2. **`ImageTransformService` interface:**
   ```typescript
   export interface ImageTransformService {
     // Returns a URL that serves the transformed image
     getTransformUrl(key: string, transforms: ImageTransformOptions): string;
     
     // Eagerly transforms and stores the result in R2 (for caching)
     transform(key: string, transforms: ImageTransformOptions): Promise<{ key: string; url: string }>;
   }
   ```

3. **Cloudflare Images adapter** (`packages/adapter-cloudflare/src/images.ts`):
   - Uses Cloudflare Images Flexible Variants URL format: `https://imagedelivery.net/<accountHash>/<imageId>/<variant>`
   - For R2-stored images: use Cloudflare Images via the Image Resizing feature on Workers (`cf.image` options on fetch)
   - `getTransformUrl(key, opts)` constructs a `fetch` URL with `cf: { image: opts }` — the image is resized on-the-fly by Cloudflare's edge
   - No eagerly-stored transformed copies needed (Cloudflare caches at edge)

4. **Docker/local adapter** (`packages/adapter-docker/src/images.ts`):
   - Uses `sharp` (already likely a devDependency) to transform in-process
   - Stores transformed result in R2/local filesystem
   - Returns the stored object URL

5. **`UploadService` integration:**
   - Add optional `transforms?: Record<string, ImageTransformOptions>` to `requestUpload` options
   - After upload confirmation (`confirmUpload`), auto-generate transform URLs and store them in the upload record metadata
   - Common preset: `{ thumbnail: { width: 100, height: 100, fit: 'cover' }, medium: { width: 400 } }`

6. **Convenience method on `StorageService`:**
   ```typescript
   // Returns the transform URL for a stored image
   storageService.getImageUrl(key, { width: 200, format: 'webp' })
   ```

**Done when:** `storageService.getImageUrl('avatars/user-123.jpg', { width: 100, height: 100, fit: 'cover', format: 'webp' })` returns a valid URL. On Cloudflare, it uses image resizing. On Docker, it uses sharp. `cruz typecheck` passes.

**Test:** Integration test (Docker adapter): upload a test image to storage fake, call `transform({ width: 50 })`, assert returned buffer has correct dimensions.

---

## P4.2 — `cruz db backup` / `cruz db restore`

**Goal:** CLI commands that create a backup of the D1 database (exported as SQL dump) and restore from a backup file.

**Why it matters:** D1 has automatic Cloudflare backups, but there's no CLI-accessible path to export/import data for local testing, staging refreshes, or disaster recovery outside Cloudflare's dashboard.

**Files to touch:**
- `packages/cli/src/commands/db.command.ts` — add `backup` and `restore` subcommands
- `packages/cli/src/utils/d1-backup.ts` — new file, backup/restore logic

**Implementation steps:**

1. **`cruz db backup [--output <file>] [--remote]`**:
   - Local: uses `wrangler d1 export <DB_NAME> --output <file>` under the hood
   - Remote: `wrangler d1 export <DB_NAME> --remote --output <file>`
   - Default output file: `backups/cruz-backup-<timestamp>.sql`
   - Creates `backups/` directory if it doesn't exist (add to `.gitignore`)
   - Prints file size and location on success

2. **`cruz db restore <file> [--remote]`**:
   - Reads the SQL file and pipes it through `wrangler d1 execute <DB_NAME> --file <file>`
   - For remote: warns "This will overwrite remote data. Type YES to confirm:"
   - For local: runs without confirmation (easily reversible)
   - Prints row counts before/after

3. **`cruz db backup --list`**: lists all files in the `backups/` directory with size and date.

4. **`.gitignore` update**: add `backups/*.sql` — backup files should not be committed.

**Done when:** `cruz db backup` creates a `.sql` file in `backups/`. `cruz db restore backups/<file>.sql` restores it. `--remote` flag works with Wrangler. `cruz typecheck` passes.

**Test:** CLI test: run `backup`, assert file exists. Run `restore`, assert command exits 0.

---

## P4.3 — Migration Rollback Helper

**Goal:** `cruz db generate:rollback <migration-name>` analyzes a forward migration SQL file and generates a best-effort reverse migration. Output is a skeleton the developer edits, not guaranteed automation.

**Why it matters:** Drizzle is forward-only by design and that's fine for DDL. But developers need a path to roll back a bad migration — even a partial skeleton that they edit is better than nothing. Production incidents are time-pressured; a starting point matters.

**Files to touch:**
- `packages/cli/src/commands/db.command.ts` — add `generate:rollback` subcommand
- `packages/cli/src/utils/rollback-generator.ts` — new file, SQL reversal logic

**Implementation steps:**

1. **`cruz db generate:rollback <migration-file-or-name>`**:
   - Accepts a migration file path or just the name (searches `apps/web/drizzle/`)
   - Reads the `.sql` file
   - Parses SQL statements and generates reverse operations:

2. **Reversal rules** (best-effort, not exhaustive):
   ```
   CREATE TABLE <name> (...)       → DROP TABLE IF EXISTS <name>;
   DROP TABLE <name>               → [cannot auto-reverse — leave TODO comment]
   ALTER TABLE ADD COLUMN <col>    → ALTER TABLE DROP COLUMN <col>;
   ALTER TABLE DROP COLUMN <col>   → [cannot auto-reverse — leave TODO]
   CREATE INDEX <name>             → DROP INDEX IF EXISTS <name>;
   DROP INDEX <name>               → [cannot auto-reverse — leave TODO]
   INSERT INTO ...                 → [cannot auto-reverse — leave TODO]
   UPDATE ...                      → [cannot auto-reverse — leave TODO]
   ```

3. Output: a new SQL file named `<timestamp>_rollback_<original-name>.sql` with:
   - Header comment explaining it's a rollback skeleton
   - Reversed statements where possible
   - `-- TODO: manually implement rollback for: <original statement>` for statements that can't be auto-reversed
   - Warning if any statement couldn't be reversed

4. CLI prints: file path created, count of auto-reversed statements, count of TODOs needing manual work.

**Done when:** Given a migration that adds a column, `generate:rollback` produces a file with `ALTER TABLE DROP COLUMN`. Given a complex data migration, it produces a file with TODO comments for manual work. `cruz typecheck` passes.

**Test:** Unit test: pass SQL string for `CREATE TABLE foo (id text)`, assert generated rollback contains `DROP TABLE IF EXISTS foo`.

---

## P4.4 — Zero-Downtime Deploy Health Check

**Goal:** `cruz deploy --health-check` waits for the deployment to complete, then hits a health endpoint to verify the new version is serving correctly before reporting success.

**Why it matters:** `wrangler pages deploy` returns success when the upload is complete, not when the new version is actually serving requests. A bad deployment that passes type check but crashes at runtime is invisible until users report it.

**Files to touch:**
- `packages/cli/src/commands/deploy.command.ts` — add `--health-check` flag + post-deploy check logic
- `packages/core/src/health/health.trpc.ts` — verify health endpoint exists (or add `health.check` procedure)
- `apps/web/src/routes/_health.tsx` — verify `/health` route exists (or add it)

**Implementation steps:**

1. **Health endpoint:** Verify `GET /health` exists and returns `{ status: 'ok', version: string, timestamp: string }`. If not, create it as a simple React Router resource route that returns JSON. The version should come from `package.json` version or a `DEPLOY_SHA` env var set during `cruz deploy`.

2. **`--health-check` flag on `cruz deploy <env>`**:
   - After `wrangler pages deploy` completes, wait 5 seconds for propagation
   - Hit `https://<deployment-url>/health` up to 10 times with 3-second intervals
   - On success (200 + `status: 'ok'`): print "Health check passed. Deploy successful."
   - On failure after all retries: print "Health check failed. Deploy may be broken. Check workers.dev dashboard." Exit with code 1.

3. **Deployment URL:** After `wrangler pages deploy`, parse stdout for the deployment URL. Wrangler outputs it as `✨ Deployment complete! Take a peek over at <url>`. Use regex to extract.

4. **Smoke test option:** `--health-check --smoke-test` additionally hits a few key routes (configurable in `cruz.config.ts` as `smokeTestRoutes: string[]`) and asserts 200 responses. Default routes: `/`, `/login`, `/api/trpc/health.check`.

**Done when:** `cruz deploy production --health-check` deploys, waits, hits `/health`, prints pass/fail. Exit code is 1 if health check fails. `cruz typecheck` passes.

**Test:** CLI test with mock wrangler output: assert health check URL is correctly extracted from wrangler stdout. Assert retry logic runs on non-200 response.
