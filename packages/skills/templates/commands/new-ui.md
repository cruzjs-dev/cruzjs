# /new-ui

Create UI for an existing feature. Specify what type of UI is needed.

## Types

- **route** — A new page (route file + page component)
- **component** — A reusable display/form/list component
- **modal** — A Dialog modal for create/edit/delete/confirm

## Required Input

- **Type**: `route`, `component`, or `modal`
- **Name**: e.g., `TasksPage`, `StatusBadge`, `CreateTaskModal`
- **Feature**: The existing feature it connects to (e.g., `task`)

## Reference Docs

- `.claude/kb/07-UI-PATTERNS.md` — Component patterns
- `.claude/kb/02-TYPESCRIPT.md` — TypeScript conventions

---

## Route

Creates a route page file + page component.

**File naming (React Router v7):**

| URL                 | File                                              |
| ------------------- | ------------------------------------------------- |
| `/tasks`            | `apps/web/src/routes/tasks._index.tsx`            |
| `/tasks/:id`        | `apps/web/src/routes/tasks.$id.tsx`               |
| `/orgs/:slug/tasks` | `apps/web/src/routes/orgs.$slug.tasks._index.tsx` |

**Route file** — default export, thin wrapper:

```typescript
import { useOutletContext } from 'react-router';
import type { OrgContext } from '@/routes/types';
import { TaskList } from '@/components/tasks/TaskList';

export default function TasksPage() {
  const { org, currentUserRole } = useOutletContext<OrgContext>();
  return <TaskList orgId={org.id} currentUserRole={currentUserRole} />;
}
```

**Page component** (`apps/web/src/components/<feature>/<Name>.tsx`):

- `export const` named export
- tRPC hooks for data
- Loading spinner, error display, empty state
- Permission-based visibility (`canManage`)

Register routes in `<feature>.routes.ts`, reference in `@Module({ routes: ... })`, add module to `modules: [...]` in `routes.ts`.

---

## Component

Creates a reusable component. Specify the variant:

### Display

Static presentation of data (cards, badges, avatars):

```typescript
type StatusBadgeProps = { status: 'active' | 'inactive' | 'pending' };

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  return <span className={`px-2 py-1 rounded-full text-sm ${styles[status]}`}>{status}</span>;
};
```

### Form

Accepts `onSubmit`, `onCancel`, `isLoading`, `defaultValues` props:

```typescript
type TaskFormProps = {
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<TaskFormData>;
};

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  defaultValues,
}) => {
  // Controlled state or React Hook Form
  // Button shows "Saving..." when isLoading
};
```

### List

Uses tRPC query + handles all states:

```typescript
export const TaskList: React.FC<{ orgId: string; currentUserRole: OrgRole | null }> = ({ orgId, currentUserRole }) => {
  const { data, isLoading, error, refetch } = trpc.task.list.useQuery();
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error.message} />;
  if (!data?.length) return <EmptyState message="No tasks yet." />;
  return <div className="space-y-2">{data.map(item => <TaskRow key={item.id} task={item} />)}</div>;
};
```

**File location**: `apps/web/src/components/<feature>/<Name>.tsx`

---

## Modal

Creates a Dialog modal. Specify the purpose: `create`, `edit`, `delete`, `confirm`.

**All modals accept**: `open`, `onOpenChange`, `onSuccess?` props.

### Create Modal

Empty form, creates new resource on submit:

```typescript
export const CreateTaskModal: React.FC<CreateModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const mutation = trpc.task.create.useMutation({
    onSuccess: () => { onSuccess?.(); onOpenChange(false); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <TaskForm onSubmit={(data) => mutation.mutate(data)} onCancel={() => onOpenChange(false)} isLoading={mutation.isPending} />
      </DialogContent>
    </Dialog>
  );
};
```

### Edit Modal

Accepts `item` prop, pre-fills form:

```typescript
type EditTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSuccess?: () => void;
};
// Pre-fill form with task.* values, call trpc.task.update.useMutation()
```

### Delete Modal

Confirmation with destructive button:

```typescript
// Dialog with "Are you sure you want to delete '{item.name}'?" message
// Red "Delete" button calling trpc.{resource}.delete.useMutation()
// Returns null if item is null
```

### Confirm Modal

Generic reusable confirmation:

```typescript
type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
};
```

**File location**: `apps/web/src/components/<feature>/<Name>Modal.tsx`

---

## Usage in Parent Component

```typescript
const [showCreate, setShowCreate] = useState(false);
const [editing, setEditing] = useState<Task | null>(null);
const { refetch } = trpc.task.list.useQuery();

<CreateTaskModal open={showCreate} onOpenChange={setShowCreate} onSuccess={refetch} />
<EditTaskModal open={!!editing} onOpenChange={(open) => !open && setEditing(null)} task={editing} onSuccess={refetch} />
```

## Examples

> Create a route at /orgs/:slug/tasks that shows a TaskList component

> Create a display component called StatusBadge for task status values: TODO, IN_PROGRESS, DONE

> Create a create modal for tasks with fields: title, description, dueDate

> Create a delete modal for tasks that shows the task title in the confirmation message
