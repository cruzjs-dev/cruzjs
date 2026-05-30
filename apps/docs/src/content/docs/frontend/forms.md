---
title: Forms
description: Form patterns with controlled inputs, Zod validation, and tRPC mutations in CruzJS.
---

CruzJS uses standard React controlled components for forms, Zod schemas for validation, and tRPC mutations for submission. There is no special form library -- the patterns are intentionally simple and composable.

## Basic Form Pattern

A typical CruzJS form follows this structure:

1. Define state for each field with `useState`.
2. Validate with a Zod schema on submit.
3. Display validation errors inline.
4. Submit via a tRPC `useMutation`.

```tsx
import { useState } from 'react';
import { z } from 'zod';
import { trpc } from '~/trpc/client';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  description: z.string().max(500).optional(),
});

type FormErrors = Partial<Record<string, string>>;

export default function CreateProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const create = trpc.project.create.useMutation({
    onSuccess: () => {
      setName('');
      setDescription('');
      setErrors({});
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const result = createProjectSchema.safeParse({ name, description });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    create.mutate(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${
            errors.name ? 'border-red-500' : 'border-slate-300'
          } focus:outline-none focus:ring-2 focus:ring-[#003DCC]/20 focus:border-[#003DCC]`}
          placeholder="My Project"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DCC]/20 focus:border-[#003DCC]"
          placeholder="Optional description..."
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description}</p>
        )}
      </div>

      {create.error && (
        <p className="text-sm text-red-600">{create.error.message}</p>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className="px-4 py-2 bg-[#003DCC] text-white font-medium rounded-lg hover:bg-[#0031A3] transition-colors disabled:opacity-50"
      >
        {create.isPending ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}
```

## Validation with Zod

Define your validation schema separately so it can be reused between the client and server. Typically the same Zod schema used in the tRPC procedure input is shared:

```typescript
// shared/schemas/project.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']).default('private'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

Use `safeParse` for validation on submit. This returns either `{ success: true, data }` or `{ success: false, error }` without throwing:

```tsx
const result = createProjectSchema.safeParse({ name, description, visibility });

if (!result.success) {
  // result.error.issues is an array of ZodIssue objects
  // Each has: path, message, code
  const fieldErrors: FormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  setErrors(fieldErrors);
  return;
}

// result.data is the validated, typed object
create.mutate(result.data);
```

## Displaying Errors

### Field-Level Errors

Show validation errors directly below each input:

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Email
  </label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className={`w-full rounded-lg border px-3 py-2 ${
      errors.email ? 'border-red-500 bg-red-50' : 'border-slate-300'
    }`}
  />
  {errors.email && (
    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
  )}
</div>
```

### Server-Side Errors

Display tRPC mutation errors at the form level. The server may return errors for conditions that client validation cannot catch (duplicate names, permission issues):

```tsx
{create.error && (
  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
    <p className="text-sm text-red-700">{create.error.message}</p>
  </div>
)}
```

### Clearing Errors

Clear field errors when the user starts typing to avoid stale messages:

```tsx
<input
  value={name}
  onChange={(e) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }}
/>
```

## Form Submission with useMutation

The `useMutation` hook provides everything you need for form submission lifecycle:

```tsx
const update = trpc.project.update.useMutation({
  onSuccess: (data) => {
    // Mutation succeeded -- redirect, show toast, reset form
    toast({ title: 'Project updated', status: 'success' });
    navigate(`/projects/${data.id}`);
  },
  onError: (error) => {
    // Server returned an error
    if (error.data?.code === 'CONFLICT') {
      setErrors({ name: 'A project with this name already exists' });
    }
  },
});

// In JSX:
<button disabled={update.isPending}>
  {update.isPending ? 'Saving...' : 'Save Changes'}
</button>
```

### Invalidating Related Queries

After a successful mutation, invalidate related queries so lists and other views update:

```tsx
const utils = trpc.useUtils();

const create = trpc.project.create.useMutation({
  onSuccess: () => {
    utils.project.list.invalidate();
    onSuccess();
  },
});
```

## Common Form Patterns

### Edit Form (Pre-populated)

Load existing data and populate the form fields:

```tsx
function EditProjectForm({ projectId }: { projectId: string }) {
  const { data, isLoading } = trpc.project.getById.useQuery({ id: projectId });
  const [name, setName] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Populate fields when data loads
  useEffect(() => {
    if (data && !initialized) {
      setName(data.name);
      setInitialized(true);
    }
  }, [data, initialized]);

  if (isLoading) return <LoadingState size="md" />;

  // ... rest of form
}
```

### Select / Dropdown

Use a standard `<select>` element with controlled state:

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
  <select
    value={role}
    onChange={(e) => setRole(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="MEMBER">Member</option>
    <option value="ADMIN">Admin</option>
    <option value="VIEWER">Viewer</option>
  </select>
</div>
```

### Toggle / Checkbox

```tsx
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    checked={isPublic}
    onChange={(e) => setIsPublic(e.target.checked)}
    className="w-4 h-4 rounded border-slate-300 text-[#003DCC] focus:ring-[#003DCC]"
  />
  <span className="text-sm text-slate-700">Make this project public</span>
</label>
```

### Form Inside a Modal

Combine `ConfirmModal` with a form:

```tsx
import { ConfirmModal } from '@cruzjs/ui';

function InviteModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const invite = trpc.member.invite.useMutation({
    onSuccess: () => {
      setEmail('');
      onClose();
    },
  });

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => invite.mutate({ email, role: 'MEMBER' })}
      title="Invite Member"
      confirmLabel="Send Invite"
      isLoading={invite.isPending}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        placeholder="colleague@example.com"
      />
    </ConfirmModal>
  );
}
```

### Multi-Step Form

Use a state machine to track the current step:

```tsx
type Step = 'basics' | 'details' | 'review';

function MultiStepForm() {
  const [step, setStep] = useState<Step>('basics');
  const [formData, setFormData] = useState({ name: '', description: '', tags: [] });

  return (
    <div>
      {step === 'basics' && (
        <BasicsStep
          data={formData}
          onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))}
          onNext={() => setStep('details')}
        />
      )}
      {step === 'details' && (
        <DetailsStep
          data={formData}
          onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))}
          onBack={() => setStep('basics')}
          onNext={() => setStep('review')}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          data={formData}
          onBack={() => setStep('details')}
          onSubmit={() => create.mutate(formData)}
        />
      )}
    </div>
  );
}
```
