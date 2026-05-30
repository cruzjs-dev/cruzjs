# @cruzjs/ui

Production-grade React component library for CruzJS applications. 124 components, zero external dependencies, fully themed with CSS variables, accessible, and mobile-responsive.

## Installation

```bash
pnpm add @cruzjs/ui
```

**Peer dependency:** `react >= 18.0.0`

## Quick Start

```tsx
import { Button, Modal, Avatar, Badge } from '@cruzjs/ui';

function App() {
  return (
    <AppShell
      header={<Navbar brand={<Logo />} items={navItems} />}
      sidebar={<Sidebar groups={sidebarGroups} />}
    >
      <PageShell title="Dashboard" tabs={tabs}>
        <StatsGrid stats={stats} />
      </PageShell>
    </AppShell>
  );
}
```

## Storybook

Every component ships with Storybook stories covering all variants, sizes, states, and mobile viewports.

```bash
# Development (hot reload)
pnpm --filter @cruzjs/ui storybook

# Build static site
pnpm --filter @cruzjs/ui storybook:build
```

Storybook runs at `http://localhost:6006` with:
- All 124 components organized by category
- Viewport presets: Mobile (375px), Tablet (768px), Desktop (1280px)
- Background toggles: Light, Dark, Subtle
- Accessibility addon (a11y) for WCAG compliance checking
- Controls panel for interactive prop editing

## Design System

All components use CSS variables from the CruzJS design system. No hardcoded colors — everything themes automatically.

### Color Tokens

| Token | Usage |
|-------|-------|
| `--color-primary` | Brand color (indigo) |
| `--color-success` | Positive actions, online status |
| `--color-warning` | Caution states |
| `--color-danger` | Destructive actions, errors |
| `--color-info` | Informational highlights |
| `--color-surface` | Background surfaces |
| `--color-text` | Primary text |
| `--color-text-secondary` | Secondary text |
| `--color-text-muted` | Muted/disabled text |

### Theming

Override CSS variables to customize the entire library:

```css
:root {
  --color-primary: #6366f1;
  --color-primary-light: #818cf8;
  --color-primary-dark: #4f46e5;
  --color-surface: #ffffff;
  --color-text: #18181b;
}
```

## Component Catalog

### Primitives

Core building blocks used everywhere.

| Component | Description |
|-----------|-------------|
| `Alert` | Status messages with info/success/warning/danger variants |
| `Avatar` / `AvatarGroup` | User avatars with image, initials, or icon fallback; status dots |
| `Badge` | Small labels and counts |
| `Breadcrumbs` | Navigation breadcrumb trail |
| `Card` | Content container with header, body, footer sections |
| `Divider` | Horizontal/vertical separator with text/icon variants |
| `Kbd` | Keyboard shortcut display (e.g., `Cmd+K`) |
| `Spinner` | Loading spinner animation |
| `Skeleton` | Content loading placeholders |
| `StatusDot` | Colored status indicator dot |
| `Tooltip` | Hover information tooltip (desktop only) |

### Forms & Inputs

| Component | Description |
|-----------|-------------|
| `Input` | Text input with error/helper text, icons |
| `Textarea` | Multi-line text input with auto-resize |
| `NumberInput` | Numeric input with increment/decrement buttons |
| `PasswordInput` | Password field with show/hide toggle |
| `PinInput` | PIN/OTP code entry (individual digit boxes) |
| `MaskInput` | Masked input (phone, SSN, etc.) |
| `Select` | Dropdown select with search |
| `Combobox` | Searchable select with custom options |
| `Checkbox` | Checkbox with indeterminate state |
| `RadioGroup` | Radio button group |
| `Switch` | Toggle switch |
| `Slider` | Range slider with single/dual thumbs |
| `DatePicker` | Calendar date picker (bottom sheet on mobile) |
| `ColorPicker` | Color selection with swatches and custom input |
| `TagsInput` | Multi-value tag input with add/remove |
| `JSONInput` | JSON editor with validation |
| `RichTextEditor` | Rich text editing with toolbar |
| `FileUploadZone` | Drag-and-drop file upload area |
| `FormField` | Form field wrapper with label, error, description |
| `AiPromptInput` | Chat-style AI input with send/attach/streaming |

### Layout

| Component | Description |
|-----------|-------------|
| `AppShell` | Full app layout: sidebar + header + main + footer |
| `Sidebar` | Collapsible nav sidebar with groups, nesting, icon-only mode |
| `Navbar` | Horizontal top nav with search, actions, responsive hamburger |
| `PageShell` | Page layout: header + tabs + content + breadcrumbs |
| `SettingsLayout` | Settings page: sidebar nav + content area |
| `SettingsSection` | Settings card with title/description + content |
| `Splitter` | Resizable split pane (horizontal/vertical) |
| `ScrollArea` | Custom scrollbar container |

### Overlays & Feedback

| Component | Description |
|-----------|-------------|
| `Modal` | Dialog overlay (centered desktop, bottom sheet mobile) |
| `Drawer` | Slide-in panel from any edge |
| `Popover` | Anchored floating panel |
| `HoverCard` | Rich preview on hover (desktop only) |
| `Menu` | Dropdown action menu with keyboard navigation |
| `CommandPalette` | Cmd+K fuzzy search modal with action groups |
| `Notification` | Toast-style notification with auto-dismiss |
| `NotificationTray` | Notification inbox popover |
| `Progress` | Linear progress bar |
| `ProgressCircular` | Circular/ring progress indicator |
| `CopyButton` | Copy-to-clipboard button with success feedback |

### Navigation

| Component | Description |
|-----------|-------------|
| `Tabs` | Tab panel with keyboard navigation |
| `Accordion` | Collapsible content sections |
| `Collapsible` | Single collapsible section |
| `Stepper` | Multi-step wizard indicator |
| `Pagination` | Page navigation controls |
| `SegmentedControl` | Segmented toggle with sliding indicator |
| `Burger` | Animated hamburger menu toggle |

### Data Display

| Component | Description |
|-----------|-------------|
| `Table` | Data table with sorting, selection |
| `DataTable` | Full-featured table: sort, filter, paginate, bulk actions, column resize |
| `Timeline` | Chronological event timeline |
| `ActivityFeed` | Activity/event stream |
| `StatsGrid` | Dashboard KPI card grid with trends |
| `Carousel` | Image/content carousel with dots and arrows |
| `QRCode` | QR code generator |
| `Tree` | Hierarchical tree view |
| `InfiniteScroll` | Infinite scroll container with loading trigger |
| `DragAndDropList` | Reorderable list via drag and drop |
| `TableOfContents` | Document outline navigation |
| `FloatingWindow` | Draggable/resizable floating panel |
| `Marquee` | Scrolling content ticker |
| `EmptyState` | Empty state illustration with action |
| `Spoiler` | Truncated content with "show more" toggle |
| `Rating` | Star rating display and input |
| `ChartContainer` | Chart wrapper with title, legend, empty state |

### Application Blocks

Pre-composed patterns for common SaaS features.

| Component | Description |
|-----------|-------------|
| `LoginBlock` | Email + password login form with social OAuth |
| `RegisterBlock` | Registration form with terms checkbox |
| `ForgotPasswordBlock` | Password reset email form |
| `OtpVerificationBlock` | OTP/PIN verification step with resend |
| `AuthLayout` | Centered auth card layout |
| `CopyableSecretModal` | Secret display with copy-guard |
| `UserMenu` | Avatar-triggered user popover menu |
| `OrgSwitcher` | Organization/workspace dropdown switcher |
| `ProfileCard` | User profile card (compact, detailed, social) |
| `TeamRoster` | Team member list with roles, invite, remove |
| `OnboardingChecklist` | Step-by-step onboarding task list |
| `OnboardingCarousel` | Onboarding slide walkthrough |
| `SharingDialog` | Invite by email with permission select |
| `PropertyPanel` | Sidebar form for editing properties |
| `FeedView` | Activity/comment stream with replies |
| `PricingCards` | Plan tier cards with feature checklists |
| `ApiKeyCard` | API key display with mask, copy, revoke |
| `AuditLog` | Timestamped event table with filters |
| `WebhookManager` | Webhook CRUD + event log + test |
| `NotificationPreferences` | Per-channel notification toggle grid |
| `ActionBar` | Floating toolbar on row selection |
| `CodePlayground` | Split editor + preview pane with file tabs |

### Marketing Blocks

Ready-to-use sections for landing pages and marketing sites.

| Component | Description |
|-----------|-------------|
| `HeroSection` | Full-width hero with heading, CTA, media |
| `FeatureGrid` | Feature card grid with icons |
| `TestimonialCarousel` | Quote carousel with avatars and ratings |
| `CTASection` | Call-to-action banner (subtle/bold/gradient) |
| `LogoCloud` | Partner logo grid with grayscale hover |
| `TeamGrid` | Team member photo grid |
| `BlogCards` | Article preview cards with tags and metadata |
| `FAQSection` | Accordion FAQ with search and categories |
| `CareerCards` | Job listing cards with department/location badges |
| `ContactSection` | Contact form + info block layout |
| `Banner` | Dismissible announcement banner |
| `Footer` | Multi-column footer with nav, social, legal |
| `MarketingNavbar` | Landing navbar with transparent-to-solid scroll |
| `HelpCenter` | Help center with search, categories, articles |

### Documentation Blocks

Components for building documentation sites.

| Component | Description |
|-----------|-------------|
| `DocSidebar` | Nested docs navigation sidebar with search |
| `DocHeader` | Doc page header with breadcrumb and edit link |
| `CodeBlock` | Code display with line numbers, copy, filename |
| `ExamplePreview` | Live preview + source code toggle |
| `ParameterField` | API parameter row (name, type, required, description) |
| `Changelog` | Version timeline with categorized changes |

## Architecture

### Zero Dependencies

Every component is built from React + CSS + Web APIs. No Radix, no Headless UI, no Floating UI, no external animation libraries.

### Mobile-First

Components use `useIsMobile()` to adapt behavior by platform:

- **Dropdowns/Selects** → bottom sheets on mobile
- **Modals** → full-screen sheets on mobile
- **Tooltips** → not rendered on mobile (info shown inline)
- **Sidebars** → full-screen overlays on mobile
- **Touch targets** → minimum 44px on mobile

### Accessibility

Every component ships with:
- Correct ARIA roles, states, and properties
- Full keyboard navigation (Tab, Enter, Space, Escape, Arrow keys)
- Focus management (trap in modals, restore on close)
- Screen reader announcements
- `prefers-reduced-motion` support

### SSR Safe

No `window`/`document` access at module load time. All browser APIs are guarded behind `useEffect` or runtime checks. `useIsMobile()` returns `false` on the server.

## Testing

```bash
# Run all component tests
pnpm --filter @cruzjs/ui test

# Watch mode
pnpm --filter @cruzjs/ui test:watch
```

2,095 tests across 118 test files using Vitest + @testing-library/react.

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

### With React Router

```tsx
import { AppShell, Navbar, Sidebar } from '@cruzjs/ui';

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
