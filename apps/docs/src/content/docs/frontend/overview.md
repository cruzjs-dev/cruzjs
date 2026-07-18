---
title: Frontend Overview
description: React + @cruzjs/ui + Tailwind 4 frontend stack in CruzJS.
---

CruzJS ships a frontend stack built on React (via React Router v7), `@cruzjs/ui` for a complete component library, and Tailwind CSS v4 for utility-first styling. The component library has zero external dependencies -- no Chakra UI, no Radix, no Headless UI, no Floating UI. Every component is built from React, CSS, and Web APIs.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Routing and SSR | React Router v7 | File-based routes, loaders, actions, server-side rendering |
| Data fetching | tRPC + React Query | Type-safe API calls, caching, optimistic updates |
| Component library | `@cruzjs/ui` | 124+ production-grade components with zero external deps |
| Utility styling | Tailwind CSS v4 | Layout, spacing, typography, color, responsive design |
| Design system | CSS variables | Themeable color tokens, dark mode, brand customization |

## Design Philosophy

### Zero-Dependency Component Library

`@cruzjs/ui` provides 124 components organized into 9 categories: Primitives, Forms and Inputs, Layout, Overlays and Feedback, Navigation, Data Display, Application Blocks, Marketing Blocks, and Documentation Blocks. Every component is built from scratch using React and CSS -- there are no third-party UI dependencies to manage, version, or bundle.

```tsx
import { Button, Modal, Avatar, Badge, DataTable, CommandPalette } from '@cruzjs/ui';
```

### CSS Variable Design System

All components consume CSS variables from the CruzJS design system. No hardcoded colors -- everything themes automatically when you change a variable.

#### Color Tokens

| Token | Usage |
|-------|-------|
| `--color-primary` | Brand color (default: indigo) |
| `--color-primary-light` | Lighter brand variant |
| `--color-primary-dark` | Darker brand variant |
| `--color-success` | Positive actions, online status |
| `--color-warning` | Caution states |
| `--color-danger` | Destructive actions, errors |
| `--color-info` | Informational highlights |
| `--color-surface` | Background surfaces |
| `--color-text` | Primary text |
| `--color-text-secondary` | Secondary text |
| `--color-text-muted` | Muted/disabled text |

#### Custom Theming

Override CSS variables to apply your brand across the entire library:

```css
:root {
  --color-primary: #6366f1;
  --color-primary-light: #818cf8;
  --color-primary-dark: #4f46e5;
  --color-surface: #ffffff;
  --color-text: #18181b;
}
```

All 124 components immediately reflect these overrides. No prop drilling, no theme provider wrappers -- just CSS.

### Mobile-First Architecture

Components use `useIsMobile()` to adapt behavior by platform:

- **Dropdowns/Selects** become bottom sheets on mobile
- **Modals** become full-screen sheets on mobile
- **Tooltips** are not rendered on mobile (info shown inline)
- **Sidebars** become full-screen overlays on mobile
- **Touch targets** are minimum 44px on mobile

### Accessibility

Every component ships with:

- Correct ARIA roles, states, and properties
- Full keyboard navigation (Tab, Enter, Space, Escape, Arrow keys)
- Focus management (trap in modals, restore on close)
- Screen reader announcements
- `prefers-reduced-motion` support
- WCAG compliance verified via Storybook a11y addon

### SSR Safe

No `window`/`document` access at module load time. All browser APIs are guarded behind `useEffect` or runtime checks. `useIsMobile()` returns `false` on the server, ensuring server-rendered markup is valid and hydration is clean.

## Installation

`@cruzjs/ui` is included in all CruzJS projects by default. To add it manually:

```bash
pnpm add @cruzjs/ui
```

**Peer dependency:** `react >= 18.0.0`

## Importing Components

All components are exported from the package root:

```tsx
import {
  AppShell,
  Navbar,
  Sidebar,
  PageShell,
  Modal,
  DataTable,
  CommandPalette,
  Input,
  Select,
  Button,
} from '@cruzjs/ui';
```

## Component Organization

Frontend code lives in two locations:

### `packages/ui/src/components/`

The `@cruzjs/ui` package exports 124 reusable components organized into 9 categories:

| Category | Count | Examples |
|----------|-------|----------|
| Primitives | 11 | Alert, Avatar, Badge, Card, Spinner, Tooltip |
| Forms and Inputs | 20 | Input, Select, DatePicker, RichTextEditor, FileUploadZone |
| Layout | 8 | AppShell, Sidebar, Navbar, PageShell, SettingsLayout |
| Overlays and Feedback | 11 | Modal, Drawer, CommandPalette, Notification, Progress |
| Navigation | 7 | Tabs, Accordion, Stepper, Pagination, SegmentedControl |
| Data Display | 17 | DataTable, Timeline, StatsGrid, Tree, DragAndDropList |
| Application Blocks | 22 | LoginBlock, OrgSwitcher, TeamRoster, PricingCards, WebhookManager |
| Marketing Blocks | 14 | HeroSection, FeatureGrid, TestimonialCarousel, Footer |
| Documentation Blocks | 6 | DocSidebar, CodeBlock, ExamplePreview, Changelog |

### `apps/web/src/`

Application-specific pages and feature components:

```
apps/web/src/
  routes/              # React Router route modules (pages)
  features/            # Feature-specific components and logic
  trpc/                # tRPC client setup and router type
  database/            # Drizzle schema and seed files
```

## Framework Integration

### Custom Links

Many components accept a `renderLink` prop for framework-specific routing:

```tsx
import { Link } from 'react-router';

<Sidebar
  groups={groups}
  renderLink={({ href, children, className }) => (
    <Link to={href} className={className}>{children}</Link>
  )}
/>
```

### Full App Layout with React Router

```tsx
import { AppShell, Navbar, Sidebar } from '@cruzjs/ui';
import { Link, Outlet, useLocation } from 'react-router';

function Layout() {
  const location = useLocation();

  return (
    <AppShell
      header={
        <Navbar
          items={navItems}
          activeId={location.pathname}
          renderLink={({ href, children, className }) => (
            <Link to={href} className={className}>{children}</Link>
          )}
        />
      }
      sidebar={
        <Sidebar
          groups={sidebarGroups}
          activeId={location.pathname}
          renderLink={({ href, children, className }) => (
            <Link to={href} className={className}>{children}</Link>
          )}
        />
      }
    >
      <Outlet />
    </AppShell>
  );
}
```

## Data Flow

Every page follows the same pattern:

1. The component calls a tRPC procedure via React Query hooks.
2. The tRPC client sends an HTTP request to `/api/trpc/*` with auth and org headers attached automatically.
3. The server resolves the procedure, runs middleware, executes business logic, and returns data.
4. React Query caches the response and triggers a re-render.
5. The component renders using `@cruzjs/ui` components and Tailwind styling.

```tsx
import { trpc } from '@/trpc/client';
import { PageShell, StatsGrid, Spinner } from '@cruzjs/ui';

export default function DashboardPage() {
  const { data, isLoading } = trpc.dashboard.stats.useQuery();

  if (isLoading) return <Spinner size="xl" />;

  return (
    <PageShell title="Dashboard" description="Your project at a glance">
      <StatsGrid stats={[
        { label: 'Users', value: data.userCount, trend: '+12%' },
        { label: 'Revenue', value: `$${data.revenue}`, trend: '+8%' },
      ]} />
    </PageShell>
  );
}
```

## Storybook

Every component ships with Storybook stories covering all variants, sizes, states, and mobile viewports. Run Storybook locally:

```bash
pnpm --filter @cruzjs/ui storybook
```

See the [Storybook guide](/frontend/storybook) for details.

## Testing

The component library includes 2,095 tests across 118 test files:

```bash
pnpm --filter @cruzjs/ui test
```

## Next Steps

- [Components](/frontend/components) -- the full 124-component catalog
- [Storybook](/frontend/storybook) -- interactive component explorer
- [tRPC Client](/frontend/trpc-client) -- fetching and mutating data
- [Layouts](/frontend/layouts) -- dashboard, org, and public layout system
- [Forms](/frontend/forms) -- form patterns with Zod validation
- [Loading and Error States](/frontend/loading-error-states) -- spinners, skeletons, error handling
