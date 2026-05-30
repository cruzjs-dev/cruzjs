# Phase 2 — Admin UI + Operational Dashboards

The admin backend API already exists in `packages/saas/src/admin/`. This phase builds the React frontend. Everything hooks into existing tRPC routers — no backend changes needed except minor additions for session/account work.

**Read before starting:** `.claude/kb/07-UI-PATTERNS.md`, `packages/saas/src/admin/admin.trpc.ts`, `packages/saas/src/admin/admin.types.ts`, `packages/saas/src/admin/admin.registry.ts`

---

## P2.1 — Admin Panel List UI

**Goal:** A generic, reusable data table component wired to the `admin.list` tRPC procedure. Given an `AdminResource` config (from `AdminRegistry`), it renders a paginated, searchable, filterable table with bulk actions and per-row actions.

**Why it matters:** Every SaaS needs an admin panel. Filament/Nova are primary reasons developers choose Laravel. Without a pre-built UI, teams spend weeks building this custom.

**Files to touch:**
- `packages/start/src/dashboard/AdminTable.tsx` — new component
- `packages/start/src/dashboard/AdminTableFilters.tsx` — new component (filter sidebar/bar)
- `packages/start/src/dashboard/AdminTablePagination.tsx` — new component
- `packages/start/src/dashboard/AdminBulkActions.tsx` — new component
- `packages/start/src/dashboard/useAdminResource.ts` — new hook, wraps admin tRPC calls
- `packages/start/src/pages/admin/AdminListPage.tsx` — new page wrapper
- `packages/start/src/pages/admin/AdminLayout.tsx` — new layout (sidebar nav of registered resources)
- `apps/web/src/routes/admin._index.tsx` — admin root route
- `apps/web/src/routes/admin.$resource._index.tsx` — dynamic resource list route
- `packages/start/src/dashboard/index.ts` — export all

**Implementation steps:**

1. **`useAdminResource(resourceName)`** hook:
   - Calls `api.admin.getResource.useQuery({ resource: resourceName })` to get column config
   - Calls `api.admin.list.useQuery({ resource, page, limit, search, filters, sort })` for data
   - Exposes `{ data, pagination, isLoading, refetch }` + mutation hooks for delete/bulkDelete/executeAction
   - Manages local state for selected rows, current page, search query, active filters

2. **`AdminTable`** component:
   ```typescript
   interface AdminTableProps {
     resource: string;
     onRowClick?: (row: Record<string, unknown>) => void;
   }
   ```
   - Renders columns from resource config. Column types: `text`, `number`, `boolean`, `date`, `badge`, `image`, `link`
   - Checkbox column for bulk selection
   - Sortable column headers (click to toggle asc/desc)
   - Empty state with icon + message
   - Loading skeleton (shimmer rows, not spinner)
   - Row actions menu (Edit, Delete, plus custom actions from resource config)
   - Bulk action bar that appears when rows are selected

3. **`AdminTableFilters`**: renders filter inputs from resource `filters` config. Each filter is a field with type-appropriate input (text, select, date range, boolean toggle). Filters are applied on change with 300ms debounce.

4. **`AdminLayout`**: sidebar listing all registered resource names from `api.admin.getResources.useQuery()`. Active resource highlighted. Admin user info + logout in header.

5. **`AdminListPage`**: combines Layout + Filters + Table. Route: `/admin/:resource`.

**Column renderer map:**
```typescript
const columnRenderers: Record<ColumnType, React.FC<{ value: unknown }>> = {
  text: ({ value }) => <span>{String(value ?? '—')}</span>,
  boolean: ({ value }) => <Badge variant={value ? 'success' : 'muted'}>{value ? 'Yes' : 'No'}</Badge>,
  date: ({ value }) => <span>{value ? formatDate(String(value)) : '—'}</span>,
  badge: ({ value }) => <Badge>{String(value)}</Badge>,
  image: ({ value }) => <img src={String(value)} className="h-8 w-8 rounded object-cover" />,
};
```

**Done when:** `/admin/users` renders a table of users with search, pagination, and a delete row action. Bulk delete works on selected rows.

---

## P2.2 — Admin Resource Detail UI (CRUD Forms)

**Goal:** Auto-generated create and edit forms based on the `AdminResource` column config. Same pattern as list — config-driven, zero custom code per resource.

**Files to touch:**
- `packages/start/src/dashboard/AdminForm.tsx` — new component, renders fields from config
- `packages/start/src/dashboard/AdminFieldRenderers.tsx` — input component per field type
- `packages/start/src/pages/admin/AdminDetailPage.tsx` — detail/edit page wrapper
- `packages/start/src/pages/admin/AdminCreatePage.tsx` — create page wrapper
- `apps/web/src/routes/admin.$resource.$id.tsx` — detail route
- `apps/web/src/routes/admin.$resource.new.tsx` — create route

**Implementation steps:**

1. **`AdminForm`** component:
   - Takes `resource` name + optional `id` (if editing)
   - Loads record via `api.admin.get.useQuery({ resource, id })` (edit mode)
   - Builds a `react-hook-form` form from resource column config
   - On submit: calls `api.admin.create.useMutation` or `api.admin.update.useMutation`
   - Shows validation errors inline (Zod errors from tRPC come back as field-level errors)

2. **Field renderers** per column type:
   - `text` → `<Input />`
   - `number` → `<Input type="number" />`
   - `boolean` → `<Switch />`
   - `date` → `<DatePicker />`
   - `select` (enum column) → `<Select options={column.options} />`
   - `textarea` → `<Textarea />`
   - Read-only fields (id, createdAt, updatedAt) rendered as disabled inputs

3. **`AdminDetailPage`**: breadcrumb (Admin > Resource > Record ID), form, save/delete buttons with confirmation dialog on delete.

4. **`AdminCreatePage`**: breadcrumb (Admin > Resource > New), empty form, save button.

**Done when:** Clicking a row in the list opens `/admin/users/:id` with a pre-filled form. Editing and saving updates the record. New record creation works.

---

## P2.3 — Job Monitoring Dashboard

**Goal:** `/admin/jobs` page showing queue depth, recent jobs, failed jobs with retry capability, and job payload inspection. Equivalent to Laravel Horizon's basic view.

**Why it matters:** Background jobs fail. Without visibility into what failed and why, debugging production issues requires raw D1 SQL queries.

**Existing API:** `packages/core/src/jobs/job.trpc.ts` — check what's already exposed. The `JobService` has `getJobCounts()`, `getFailedJobs()`, `getJobByLookupKey()`.

**Files to touch:**
- `packages/core/src/jobs/job.trpc.ts` — add `list`, `get`, `retry`, `cancel` procedures if missing
- `packages/start/src/dashboard/JobsDashboard.tsx` — new component
- `packages/start/src/dashboard/JobsTable.tsx` — new component
- `packages/start/src/dashboard/JobDetail.tsx` — payload + error inspection modal
- `apps/web/src/routes/admin.jobs.tsx` — route
- `apps/web/src/routes/admin.jobs.$id.tsx` — job detail route

**Implementation steps:**

1. **Extend `job.trpc.ts`** if missing:
   - `jobs.list({ status?, type?, page, limit })` — paginated job list
   - `jobs.get({ id })` — single job with full payload + error
   - `jobs.retry({ id })` — reset status to PENDING, re-enqueue
   - `jobs.cancel({ id })` — set status to CANCELED (new status value)

2. **`JobsDashboard`** — top section:
   - Stat cards: Pending, Processing, Completed (today), Failed (today), Total
   - Auto-refreshes every 10 seconds via `refetchInterval: 10_000` on the query
   - Tab switcher: All | Pending | Processing | Failed | Completed

3. **`JobsTable`** — columns: Type, Status badge (color-coded), Attempts/MaxAttempts, Scheduled For, Created At, Actions (View, Retry if failed, Cancel if pending)

4. **`JobDetail`** modal/drawer:
   - Job metadata (id, type, status, attempts, timings)
   - Payload rendered as formatted JSON (`<pre>` with syntax highlight)
   - Error message + stack trace if failed
   - Retry button directly in drawer

5. **Status color map:**
   ```typescript
   const statusVariants = {
     PENDING: 'warning',
     PROCESSING: 'info',
     COMPLETED: 'success',
     FAILED: 'error',
     CANCELED: 'muted',
   };
   ```

**Done when:** `/admin/jobs` shows live job counts. Failed jobs appear in the Failed tab. Clicking a failed job shows the error. Retry button re-queues it.

---

## P2.4 — Session Management UI

**Goal:** Settings page showing all active sessions for the current user with device/location info and a "Revoke" button per session. "Revoke all other sessions" bulk action.

**Existing API:** `packages/core/src/auth/session.service.ts` has `getUserSessions()` and `invalidateAll()`. Need to verify `invalidate(sessionId)` per-session revocation exists.

**Files to touch:**
- `packages/core/src/auth/auth.trpc.ts` — add `sessions.list`, `sessions.revoke`, `sessions.revokeAll` procedures
- `packages/start/src/pages/settings/SessionsPage.tsx` — new page
- `apps/web/src/routes/settings.sessions.tsx` — new route

**Implementation steps:**

1. **`auth.trpc.ts` additions** (under `protectedProcedure`):
   ```typescript
   // sessions.list — returns array of sessions with metadata
   // sessions.revoke({ sessionId }) — invalidates specific session (cannot revoke current)
   // sessions.revokeAll — invalidates all sessions except current
   ```

2. **`SessionsPage`**:
   - Header: "Active Sessions" with "Revoke all other devices" button
   - List of session cards showing:
     - Device type icon (browser/mobile/api)
     - IP address (if stored) or "Unknown location"
     - Last active timestamp ("2 hours ago")
     - "Current session" badge on the active one
     - "Revoke" button (disabled on current session)
   - Optimistic UI: session disappears immediately on revoke, rolls back on error
   - Confirmation dialog before "Revoke all other devices"

3. **Session metadata:** `session.service.ts` may not store user-agent or IP currently. Check what's in the KV session store. If metadata is missing, add `userAgent` and `ipAddress` to the session creation payload in `auth.trpc.ts` (read from request headers).

**Done when:** `/settings/sessions` shows all active sessions. Revoking a non-current session removes it from the list. Current session cannot be revoked. "Revoke all other devices" clears everything else.

---

## P2.5 — Account Deletion Flow

**Goal:** Self-service account deletion with a confirmation step, a 30-day grace period (soft delete), and a basic data export option (JSON dump of user-owned data). GDPR compliance stub.

**Files to touch:**
- `packages/core/src/auth/auth.trpc.ts` — add `account.requestDeletion`, `account.cancelDeletion`, `account.exportData`
- `packages/core/src/auth/auth.service.ts` — add `requestAccountDeletion(userId)`, `cancelDeletion(userId)`, `exportUserData(userId)`
- `packages/core/src/database/schema.ts` — add `deletionRequestedAt` to `users` or `identities` table (nullable timestamp)
- `packages/start/src/pages/settings/DangerZonePage.tsx` — new page
- `apps/web/src/routes/settings.danger.tsx` — new route
- `packages/core/src/jobs/handlers/delete-account.handler.ts` — new job handler for final deletion after grace period

**Implementation steps:**

1. **Schema change:** Add `deletionRequestedAt` (nullable timestamp) to the identities or users table. Generate migration.

2. **`requestAccountDeletion(userId)`** service method:
   - Sets `deletionRequestedAt = now()` on user record
   - Schedules a `DELETE_ACCOUNT` job with `scheduledFor = now() + 30 days`
   - Sends confirmation email ("Your account will be deleted in 30 days. Click here to cancel.")
   - Invalidates all active sessions except current

3. **`cancelDeletion(userId)`**:
   - Clears `deletionRequestedAt`
   - Cancels the pending `DELETE_ACCOUNT` job (by lookup key)

4. **`exportUserData(userId)`**:
   - Collects user record, org memberships, and any user-owned records
   - Returns a JSON object (not a file download — just the data in the response)
   - Future: generate a file, upload to R2, email download link

5. **`DeleteAccountJobHandler`**:
   - Checks `deletionRequestedAt` is still set (user didn't cancel)
   - Hard-deletes the user, cascades via FK constraints
   - Sends "Your account has been deleted" email

6. **`DangerZonePage`** UI:
   - "Export my data" button → downloads JSON
   - "Delete account" section with red border card
   - If no pending deletion: confirmation dialog (type email address to confirm) → triggers `requestDeletion`
   - If pending deletion: shows countdown ("Your account will be deleted in 28 days") + "Cancel deletion" button

**Done when:** User can request deletion, receive confirmation email, see countdown on settings page, cancel deletion, and re-request. Grace period job fires after 30 days (verify via test with mocked date). `cruz typecheck` passes.
