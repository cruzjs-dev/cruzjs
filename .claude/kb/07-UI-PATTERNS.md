# UI Patterns

## Vite SSR Config

`@cruzjs/ui` **must** be in `ssr.noExternal`. Without this, Vite's pre-bundled browser deps cache and Node.js native loading can create separate module instances, breaking component theming.

```typescript
// vite.config.ts
ssr: {
  noExternal: isBuild
    ? ['inversify', /^@cruzjs\//,  /^@react-router\//]
    : ['inversify', /^@cruzjs\//],
}
```

This is already set correctly in the `@cruzjs/create` template.

---

## Component Library

CruzJS uses **Tailwind CSS** and **`@cruzjs/ui`**:

- **Tailwind CSS** - Primary styling for custom layouts and design system
- **`@cruzjs/ui`** - Modals, forms, toasts, and complex interactive components (zero external deps)
- **`@cruzjs/start`** - Shared components (StatCard, PageHeader, SectionCard, etc.)

## Styling Pattern

### Use Tailwind for Layout

```typescript
// PREFERRED - Tailwind for layout and styling
<div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
  <h2 className="text-xl font-semibold text-slate-900 mb-4">Title</h2>
  <p className="text-slate-600">Description</p>
  <button className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
    Submit
  </button>
</div>
```

### Use @cruzjs/ui for Complex Components

```typescript
// @cruzjs/ui for modals
import { Modal, Button, Input } from '@cruzjs/ui';

<Modal isOpen={isOpen} onClose={onClose} title="Edit Item">
  <div className="space-y-4">
    <label className="block text-sm font-medium text-slate-700">
      Name
      <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
    </label>
  </div>
  <div className="flex justify-end gap-3 mt-6">
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </div>
</Modal>
```

## Shared UI Components

Import from `@cruzjs/start`:

```typescript
import {
  StatCard,
  SectionCard,
  PageHeader,
  DetailRow,
  ActionItem,
  TabNavigation,
  OrgHeader,
  ConfirmModal,
  LoadingState,
  EmptyState,
  PermissionDenied,
} from '@cruzjs/start';
```

### StatCard

```typescript
<StatCard
  icon={<UsersIcon />}
  label="Total Members"
  value={memberCount}
  color="primary"  // primary | emerald | cyan | amber | red | purple | slate
/>
```

### SectionCard

```typescript
<SectionCard
  title="Settings"
  headerAction={<Button>Edit</Button>}
  variant="default"  // default | danger
>
  <DetailRow icon={<MailIcon />} label="Email" value={user.email} mono />
  <DetailRow icon={<CalendarIcon />} label="Created" value={formatDate(user.createdAt)} />
</SectionCard>
```

### PageHeader

```typescript
<PageHeader
  title="Organization Settings"
  description="Manage your organization's configuration"
  actionButton={<Button colorScheme="blue">Save Changes</Button>}
/>
```

### ConfirmModal

```typescript
<ConfirmModal
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={handleDelete}
  title="Delete Item"
  confirmLabel="Delete"
  variant="danger"  // primary | danger
  isLoading={deleting}
>
  Are you sure you want to delete this item?
</ConfirmModal>
```

## Route Files

Route files use **default exports** and live inside the feature at `features/<name>/routes/`. File names are prefixed with the feature name (e.g. `notes._index.tsx`, `notes.$id.tsx`).

Routes are declared in `<feature>.routes.ts` and registered via `@Module` — **never** manually wired in `routes.ts`.

```typescript
// apps/web/src/features/notes/routes/notes._index.tsx
import { trpc } from '@cruzjs/web/trpc/client';

export default function NotesIndexPage() {
  const { data, isLoading } = trpc.notes.list.useQuery();

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Notes" />
      {data?.map(note => <NoteRow key={note.id} note={note} />)}
    </div>
  );
}
```

```typescript
// apps/web/src/features/notes/notes.routes.ts
import type { CruzRouteHelpers } from '@cruzjs/core/routing';

export function notesRoutes(helpers: CruzRouteHelpers) {
  return [
    ...helpers.prefix('notes', [
      helpers.index('features/notes/routes/notes._index.tsx'),
      helpers.route(':id', 'features/notes/routes/notes.$id.tsx'),
    ]),
  ];
}
```

```typescript
// apps/web/src/features/notes/notes.module.ts — reference routes here
@Module({ pageRoutes: notesRoutes })
export class NotesModule {}
```

```typescript
// apps/web/src/routes.ts — add module, never manually wire routes
export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  modules: [NotesModule],
  routes: [index('routes/index.tsx')],
}) satisfies RouteConfig;
```

## Component Files

Components use **inline named exports** and live in `apps/web/src/components/`:

```typescript
// apps/web/src/components/products/ProductsList.tsx
import { trpc } from '@cruzjs/web/trpc/client';
import { SectionCard, LoadingState, EmptyState } from '@cruzjs/start';

type ProductsListProps = {
  orgId: string;
  currentUserRole: string | null;
};

export const ProductsList: React.FC<ProductsListProps> = ({ orgId, currentUserRole }) => {
  const { data, isLoading, refetch } = trpc.product.list.useQuery();

  if (isLoading) {
    return <LoadingState text="Loading products..." />;
  }

  if (!data?.length) {
    return <EmptyState message="No products yet" />;
  }

  return (
    <SectionCard title="Products">
      <div className="space-y-4">
        {data.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </SectionCard>
  );
};
```

## tRPC Hooks

### Queries

```typescript
// Basic query
const { data, isLoading, error, refetch } = trpc.product.list.useQuery();

// With input
const { data } = trpc.product.get.useQuery({ id: productId });

// Conditional query
const { data } = trpc.product.get.useQuery(
  { id: productId },
  { enabled: !!productId }
);
```

### Mutations

```typescript
const createMutation = trpc.product.create.useMutation({
  onSuccess: () => {
    refetch();
    onClose();
  },
  onError: (error) => {
    console.error(error.message);
  },
});

const handleCreate = () => {
  createMutation.mutate({ name: 'New Product' });
};
```

## Modal Pattern

```typescript
const [showModal, setShowModal] = useState(false);
const [selectedItem, setSelectedItem] = useState<Product | null>(null);

const handleEdit = (product: Product) => {
  setSelectedItem(product);
  setShowModal(true);
};

const handleClose = () => {
  setShowModal(false);
  setSelectedItem(null);
};

return (
  <>
    <ProductRow onEdit={handleEdit} />

    <Modal isOpen={showModal} onClose={handleClose} title="Edit Product">
      <ProductForm
        product={selectedItem}
        onSuccess={() => { handleClose(); refetch(); }}
      />
    </Modal>
  </>
);
```

## Permission-Based UI

```typescript
const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
const canDelete = currentUserRole === 'OWNER';

return (
  <div>
    {canManage && (
      <Button onClick={() => setShowCreate(true)}>Create Product</Button>
    )}

    <ProductRow
      showEditButton={canManage}
      showDeleteButton={canDelete}
    />
  </div>
);
```

## Loading States

```typescript
import { LoadingState } from '@cruzjs/start';
import { Spinner } from '@cruzjs/ui';

// Using shared component
if (isLoading) {
  return <LoadingState text="Loading..." />;
}

// Using @cruzjs/ui directly
if (isLoading) {
  return (
    <div className="flex justify-center py-8">
      <Spinner size="xl" />
    </div>
  );
}
```

## Error States

```typescript
import { Alert } from '@cruzjs/ui';

if (error) {
  return (
    <Alert variant="error">
      {error.message}
    </Alert>
  );
}
```

## Design System Colors

```typescript
// Brand colors (defined in tailwind.config.js)
className="bg-brand-600"       // Primary brand blue
className="text-brand-500"     // Lighter brand blue
className="border-brand-200"   // Very light brand

// Semantic colors
className="bg-slate-50"        // Background
className="text-slate-900"     // Primary text
className="text-slate-500"     // Secondary text
className="border-slate-200"   // Borders

// Status colors
className="text-emerald-600"   // Success
className="text-amber-600"     // Warning
className="text-red-600"       // Error/Danger
```

## Typography

```typescript
// Headings
className="text-2xl font-bold text-slate-900"   // Page title
className="text-xl font-semibold text-slate-900" // Section title
className="text-lg font-medium text-slate-800"  // Subsection

// Body
className="text-base text-slate-700"            // Primary text
className="text-sm text-slate-600"              // Secondary text
className="text-xs text-slate-500"              // Helper text

// Labels
className="text-xs font-medium uppercase tracking-wide text-slate-500"
```
