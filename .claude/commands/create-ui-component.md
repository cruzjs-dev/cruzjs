---
name: create-ui-component
description: Build production-grade UI components for packages/ui. Single component or loop mode through UI_COMPONENTS_PLAN.md. Storybook + Playwright MCP visual/functional testing + designer-grade screenshot analysis.
model: opus
color: cyan
---

# /create-ui-component

Build production-grade UI components for `packages/ui`, verify with Storybook + Playwright MCP, iterate until world-class.

## Modes

**Single component:**
```
/create-ui-component Button
/create-ui-component Select "searchable, multi-select support"
```

**Loop mode** — iterate through `UI_COMPONENTS_PLAN.md` build order:
```
/create-ui-component --loop
/loop /create-ui-component
```

Loop mode picks next PENDING component from tracker, builds it, Storybook-tests it with Playwright MCP, does designer-grade screenshot analysis, iterates until design score ≥ 8/10, marks done, moves to next.

---

## Scope: Core Primitive Library

`packages/ui` is CruzJS's equivalent of Chakra UI, Mantine, or Ionic — generic, reusable, zero business logic. Components here know nothing about orgs, users, billing, tRPC, or any domain model.

**In scope:** Button, Select, Modal, Table, Avatar, Badge, Toast, Tabs, Slider, DatePicker...
**Out of scope:** OrgCard, MemberRow, ApiKeyManager, BillingForm — those live in `packages/start` or `packages/saas`.

Rule: if a component imports from `@cruzjs/core`, `@cruzjs/start`, or any tRPC router, it does not belong here. Zero domain coupling.

---

# PART 1: LOOP PIPELINE

Only applies when invoked with `--loop` or via `/loop`. Skip to Part 2 for single-component mode.

## Setup (first invocation only)

### 1. Ensure Storybook is installed

```bash
ls packages/ui/.storybook/main.ts 2>/dev/null
```

If missing, install and configure:

```bash
cd packages/ui && npx storybook@latest init --type react --builder vite --no-dev
```

Then configure `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

Configure `.storybook/preview.ts`:

```typescript
import type { Preview } from '@storybook/react';
import '../../../apps/web/src/index.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
    backgrounds: {
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1e293b' },
        { name: 'subtle', value: '#f8fafc' },
      ],
    },
  },
};

export default preview;
```

Verify Tailwind processes stories — may need postcss config or content paths.

### 2. Initialize progress tracker

```bash
TRACKER=".cruz-agent/local/ui-library/PROGRESS.md"
mkdir -p "$(dirname "$TRACKER")"
```

If `$TRACKER` doesn't exist, create from `UI_COMPONENTS_PLAN.md` — ALL phases, ALL components:

```markdown
# UI Library Build Progress

## Phase 1 — Enhance Existing (packages/ui)
| Component | Status | Score | Iterations | Updated | Work |
|-----------|--------|-------|------------|---------|------|
| StateComponents | PENDING | — | 0 | — | Split → EmptyState, LoadingState, PermissionDenied named exports |
| FormControls | PENDING | — | 0 | — | Add error/helper props to Input and Select |
| PageHeader | PENDING | — | 0 | — | Add breadcrumb slot |
| StatCard | PENDING | — | 0 | — | Add delta/trend prop |
| ConfirmModal | PENDING | — | 0 | — | Add destructive variant |
| TabNavigation | PENDING | — | 0 | — | Decouple from React Router; accept onTabChange + active prop |
| Toast | PENDING | — | 0 | — | Standardize position/stack behavior |

## Phase 2 — Extract from start/core into ui
| Component | Status | Score | Iterations | Updated | Source |
|-----------|--------|-------|------------|---------|--------|
| FormField | PENDING | — | 0 | — | start → ui (label + input + error + helper) |
| FileUpload | PENDING | — | 0 | — | start → ui (remove tRPC dep, callback props) |
| AuthLayout | PENDING | — | 0 | — | core → ui (pure centered-card layout) |
| CopyableSecretModal | PENDING | — | 0 | — | Extract pattern from CreateApiKeyModal |

## Phase 3 — New Primitives (High Priority)
| Component | Status | Score | Iterations | Updated |
|-----------|--------|-------|------------|---------|
| Alert | PENDING | — | 0 | — |
| Badge | PENDING | — | 0 | — |
| Avatar | PENDING | — | 0 | — |
| Tooltip | PENDING | — | 0 | — |
| Spinner | PENDING | — | 0 | — |
| Skeleton | PENDING | — | 0 | — |
| Progress | PENDING | — | 0 | — |
| ProgressCircular | PENDING | — | 0 | — |
| Modal | PENDING | — | 0 | — |
| Drawer | PENDING | — | 0 | — |
| Popover | PENDING | — | 0 | — |
| Accordion | PENDING | — | 0 | — |
| Tabs | PENDING | — | 0 | — |
| Table | PENDING | — | 0 | — |
| Card | PENDING | — | 0 | — |
| Pagination | PENDING | — | 0 | — |
| Stepper | PENDING | — | 0 | — |
| Select | PENDING | — | 0 | — |
| Combobox | PENDING | — | 0 | — |
| Checkbox | PENDING | — | 0 | — |
| RadioGroup | PENDING | — | 0 | — |
| Switch | PENDING | — | 0 | — |
| Slider | PENDING | — | 0 | — |
| Input | PENDING | — | 0 | — |
| Textarea | PENDING | — | 0 | — |
| NumberInput | PENDING | — | 0 | — |
| PasswordInput | PENDING | — | 0 | — |
| PinInput | PENDING | — | 0 | — |

## Phase 4 — Medium Priority (App-Level Patterns)
| Component | Status | Score | Iterations | Updated |
|-----------|--------|-------|------------|---------|
| Notification | PENDING | — | 0 | — |
| Breadcrumbs | PENDING | — | 0 | — |
| Menu | PENDING | — | 0 | — |
| HoverCard | PENDING | — | 0 | — |
| Carousel | PENDING | — | 0 | — |
| Timeline | PENDING | — | 0 | — |
| FileUploadZone | PENDING | — | 0 | — |
| ColorPicker | PENDING | — | 0 | — |
| TagsInput | PENDING | — | 0 | — |
| DatePicker | PENDING | — | 0 | — |
| SegmentedControl | PENDING | — | 0 | — |
| Rating | PENDING | — | 0 | — |
| EmptyState | PENDING | — | 0 | — |
| StatusDot | PENDING | — | 0 | — |
| CopyButton | PENDING | — | 0 | — |
| ScrollArea | PENDING | — | 0 | — |
| Collapsible | PENDING | — | 0 | — |
| ActivityFeed | PENDING | — | 0 | — |
| NotificationTray | PENDING | — | 0 | — |

## Phase 5 — Lower Priority (Specialized)
| Component | Status | Score | Iterations | Updated |
|-----------|--------|-------|------------|---------|
| Splitter | PENDING | — | 0 | — |
| QRCode | PENDING | — | 0 | — |
| RichTextEditor | PENDING | — | 0 | — |
| Marquee | PENDING | — | 0 | — |
| MaskInput | PENDING | — | 0 | — |
| JSONInput | PENDING | — | 0 | — |
| FloatingWindow | PENDING | — | 0 | — |
| InfiniteScroll | PENDING | — | 0 | — |
| DragAndDropList | PENDING | — | 0 | — |
| Tree | PENDING | — | 0 | — |
| TableOfContents | PENDING | — | 0 | — |
```

### 3. Start Storybook

```bash
cd packages/ui && npx storybook dev -p 6006 --no-open &
sleep 15
curl -s http://localhost:6006 > /dev/null && echo "Storybook running" || echo "Storybook not ready"
```

## Loop Execution

### Step 1: Pick next component

Read `$TRACKER`. First PENDING row = target. No PENDING → `ALL_COMPONENTS_COMPLETE`, stop.

Update status to `BUILDING`.

### Step 2: Read reference

1. `UI_COMPONENTS_PLAN.md` — component's row for cross-library feature notes
2. This skill (Part 2) — all build conventions
3. `ls packages/ui/src/components/` — check for existing similar components

### Step 3: Build

Follow Part 2 rules exactly. Create all files, run unit tests.

### Step 4: Storybook + Playwright MCP verification

Follow Part 3 (Playwright MCP Testing Pipeline). Every story variant tested.

### Step 5: Designer analysis

Follow Part 4 (Designer-Grade Visual Analysis). Minimum 8/10 average to pass.

### Step 6: Iterate if needed

Design score < 8 or tests fail → fix, re-test. Max 3 iterations per component.

### Step 7: Mark complete

Update `$TRACKER` → `DONE`, record score and iteration count.

Commit:

```bash
git add packages/ui/src/components/<Name>/ packages/ui/src/index.ts
git commit -m "feat(ui): add <Name> component with Storybook stories

- All variants, sizes, and states
- Full keyboard navigation and ARIA support
- Mobile-native behavior via useIsMobile()
- Design score: X.X/10 average
- Visual verification via Playwright screenshots

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### Step 8: Report and loop

```
## ✅ <Name> Complete — X.X/10

| Criterion | Score |
|-----------|-------|
| Hierarchy | X |
| Spacing | X |
| Typography | X |
| Color | X |
| Depth & Shadow | X |
| Interactive Feedback | X |
| Mobile Feel | X |
| Polish | X |
| Delight | X |

Iterations: N | Stories: N | Next: <NextComponent> (N remaining)
```

Loop to Step 1.

## Continuation

If resuming:
1. Read `$TRACKER` for current state
2. `BUILDING` → interrupted, restart component
3. `TESTING` → re-run Playwright tests
4. `DONE` → next PENDING
5. Check Storybook: `curl -s http://localhost:6006`

---

# PART 2: COMPONENT BUILD RULES

These apply to EVERY component — single or loop mode. Non-negotiable.

## Rule #1: Platform-Native Feel

**Most important design rule.** Components must feel native to each platform — not just "responsive."

### Desktop vs Mobile — Different Paradigms

| Paradigm | Desktop | Mobile |
|----------|---------|--------|
| **Interaction** | Mouse hover, precise clicks | Thumb tap, swipe, long-press |
| **Reachability** | Full screen, any position | Bottom half of screen preferred |
| **Overlays** | Float near trigger | Slide up from bottom (full-width) |
| **Navigation** | Sidebars, dropdowns, popovers | Bottom sheets, full-screen panels |
| **Feedback** | Tooltips, hover states | Always-visible labels, tap targets ≥44px |
| **Scrolling** | Scrollbar-driven | Touch momentum, pull-to-refresh |

### Required Transformations by Component Type

**Dropdown / Select / Menu / Combobox:**
- Desktop → anchored floating panel near trigger
- Mobile → bottom sheet sliding up from screen bottom, full width, drag handle, swipe-to-dismiss

**Modal / Dialog:**
- Desktop → centered overlay, max-width constrained
- Mobile → full-screen sheet sliding up from bottom

**Popover / Hover Card:**
- Desktop → floating tooltip/card anchored to trigger
- Mobile → do NOT render. Show the information inline, always-visible, or via tap-to-expand

**Tooltip:**
- Desktop → hover-triggered floating label
- Mobile → do NOT render tooltips at all. Info must be surfaced another way

**Drawer / Sidebar:**
- Desktop → slides in from edge, partial-width overlay
- Mobile → full-screen with swipe-to-dismiss gesture

**Context Menu / Action Menu:**
- Desktop → right-click floating menu
- Mobile → bottom action sheet (full-width list of actions)

**Date Picker:**
- Desktop → calendar popover
- Mobile → full-screen calendar modal or defer to native `<input type="date">`

**Tabs (many tabs):**
- Desktop → full horizontal bar
- Mobile → horizontally scrollable; active tab auto-scrolls into view

**Form with many fields:**
- Desktop → side-by-side columns
- Mobile → single column, inputs full-width, labels above

### Detection

Use `useIsMobile()` to branch at component level:

```tsx
const isMobile = useIsMobile();
return isMobile ? <BottomSheet ... /> : <DropdownPanel ... />;
```

For Storybook: every component with platform-specific behavior MUST have a `Mobile` story with `viewport: mobile1`.

### SSR Compatibility

- Never access `window`, `document`, `navigator` at module load time
- Guard browser APIs: `typeof ResizeObserver !== 'undefined'`
- `useIsMobile()` returns `false` on server (safe default)

```typescript
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}
```

## Rule #2: File Structure

```
packages/ui/src/components/<ComponentName>/
  <ComponentName>.tsx          # Component implementation
  <ComponentName>.test.tsx     # Unit tests (vitest + testing-library)
  <ComponentName>.stories.tsx  # Storybook stories
  index.ts                     # Re-export
```

Add to `packages/ui/src/index.ts`:
```typescript
export * from './components/<ComponentName>';
```

## Rule #3: CSS Variables Only — No Hardcoded Colors

Every color must reference a CSS variable. Never write hex, rgb, or named colors inline.

**Available design tokens (`@theme` in `apps/web/src/index.css`):**

```
Brand (vibrant indigo)
  --color-primary          #6366f1
  --color-primary-light    #818cf8
  --color-primary-dark     #4f46e5
  --color-primary-lighter  #a5b4fc
  --color-primary-subtle   #eef2ff
  --color-primary-glow     color-mix(in srgb, #6366f1 30%, transparent)

Semantic
  --color-accent           #10b981  (emerald)
  --color-accent-subtle    #ecfdf5
  --color-info             #3b82f6  (blue)
  --color-info-light       #60a5fa
  --color-info-subtle      #eff6ff
  --color-success          #22c55e
  --color-success-dark     #16a34a
  --color-success-text     #15803d
  --color-success-subtle   #f0fdf4
  --color-success-bg       #dcfce7
  --color-success-border   #bbf7d0
  --color-warning          #f59e0b
  --color-warning-light    #fbbf24
  --color-warning-text     #b45309
  --color-warning-subtle   #fffbeb
  --color-danger           #ef4444
  --color-danger-dark      #dc2626
  --color-danger-text      #b91c1c
  --color-danger-subtle    #fef2f2

Surface (zinc scale, warmer than slate)
  --color-surface          #ffffff
  --color-surface-light    #fafafa
  --color-surface-lighter  #f4f4f5
  --color-surface-border   #e4e4e7
  --color-surface-raised   #ffffff

Text (zinc scale)
  --color-text             #18181b
  --color-text-strong      #09090b
  --color-text-secondary   #52525b
  --color-text-tertiary    #71717a
  --color-text-muted       #a1a1aa

Input
  --color-input-border     #d4d4d8

Dark surface
  --color-dark-surface     #18181b
  --color-dark-border      #27272a
  --color-dark-text        #fafafa
  --color-dark-text-muted  #a1a1aa

Animation
  --ease-spring            cubic-bezier(0.34, 1.56, 0.64, 1)
  --ease-smooth            cubic-bezier(0.25, 0.1, 0.25, 1)
  --ease-out-expo          cubic-bezier(0.16, 1, 0.3, 1)
```

**In Tailwind 4**, `@theme` vars are available as utility classes:
```tsx
// Good — uses CSS variable
<div className="bg-primary text-surface border-surface-border" />

// Bad — hardcoded
<div className="bg-indigo-600 text-white border-slate-200" />
```

For one-off values, use `var()` inline style or extend `@theme`.

## Rule #4: No External Dependencies

Zero new npm packages. Build everything from:
- React + hooks
- CSS (Tailwind 4 utilities + `@layer components`)
- Web APIs: `dialog`, `popover`, `IntersectionObserver`, `ResizeObserver`, `PointerEvents`, `matchMedia`, `View Transitions`
- Native browser features: `inert`, `aria-*`, `:has()`, `@starting-style`, `anchor positioning`

If you think you need a dep, ask: "Can I do this with a CSS animation + a ref?"

## Rule #5: TypeScript — Strict, No `any`

```typescript
// Always extend the base HTML element's props
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

// Use discriminated unions for mutually exclusive states
type SelectState =
  | { status: 'idle' }
  | { status: 'open'; query: string }
  | { status: 'loading' };

// Forward refs when wrapping native elements
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', size = 'md', loading, ...props }, ref) => { ... }
);
Button.displayName = 'Button';
```

## Rule #6: Accessibility — Built In, Not Bolted On

Every component ships with full a11y:
- Correct ARIA roles, states, properties
- Full keyboard navigation (Tab, Enter, Space, Escape, Arrow keys)
- Focus management (trap in modals/drawers, restore on close)
- Screen reader announcements (`aria-live`, `role="status"`)
- Touch target minimum 44×44px on mobile
- `prefers-reduced-motion` respected

Use native HTML where possible: `<button>`, `<dialog>`, `<details>`, `<select>`. Enhance; don't replace.

---

## Mobile-Native Behavior Patterns

### The Platform Hook

```typescript
// packages/ui/src/hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}
```

### Bottom Sheet Pattern

```typescript
function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !open) return;

    let startY = 0;
    let currentY = 0;

    const onPointerDown = (e: PointerEvent) => {
      startY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      currentY = Math.max(0, e.clientY - startY);
      el.style.transform = `translateY(${currentY}px)`;
    };
    const onPointerUp = () => {
      el.style.transform = '';
      el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      if (currentY > 120) onClose();
      setTimeout(() => { el.style.transition = ''; }, 300);
      currentY = 0;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface pb-safe-area-inset-bottom
        shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]
        transition-transform duration-300 ease-out
        ${open ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
      {children}
    </div>
  );
}
```

### Focus Trap (no external dep — native `inert`)

```typescript
function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const siblings = Array.from(document.body.children).filter(c => c !== el);
    siblings.forEach(s => s.setAttribute('inert', ''));

    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    return () => {
      siblings.forEach(s => s.removeAttribute('inert'));
    };
  }, [active, ref]);
}
```

---

## Visual Design Language: "Refined Kinetic" (Apple HIG + Google Luminous)

Inspired by Apple Human Interface Guidelines and Google's Luminous Design. Own identity, not a copy — but follows their lead on modernity, depth, and physicality.

### Core Principles

1. **Tonal Surfaces (Luminous)** — backgrounds use `color-mix()` to tint the surface with 4–8% of the semantic color. Never flat white or raw color fills. This creates luminous, cohesive grouping without heavy borders.
2. **Glyph-in-Container (Apple HIG)** — icons wrapped in small tinted pills (`ring-1 ring-{color}/20` + tinted bg). Not floating bare icons. The container gives weight and intentionality.
3. **Ring Borders over Hard Borders** — prefer `ring-1 ring-{color}/20` over `border border-{color}`. Rings feel lighter and more modern. Borders for structural separation only (cards, dividers).
4. **Inset Highlights (iOS)** — solid-fill elements get `shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]` for that glass-under-light effect Apple uses on buttons/pills.
5. **Spring Physics** — dismiss, enter, and scale animations use `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`. Slight overshoot = alive, physical.
6. **Color Halos** — dot indicators and status markers get a soft glow ring via `shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-{x})_20%,transparent)]`.
7. **Generous Radius** — `rounded-2xl` (16px) for containers, `rounded-xl` for cards, `rounded-lg` for inputs/buttons, `rounded-full` for pills/badges/avatars.
8. **Layered Shadows** — two-layer shadows with negative spread: `shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]`. Subtle directional depth, never flat.

### Typography

- **Primary font:** Plus Jakarta Sans (geometric humanist, warmer than Inter)
- **Code font:** JetBrains Mono
- Base: 14px, line-height 1.6, letter-spacing -0.011em
- Headings: `font-semibold tracking-tight leading-snug`
- `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` (set in body)
- `font-optical-sizing: auto`

### Color System

**Never use hardcoded hex/rgb.** All colors via CSS variables + Tailwind 4 utilities.

**Tonal background pattern** (use everywhere instead of flat fills):
```tsx
// 4% tint for containers (alerts, cards with semantic meaning)
style={{ backgroundColor: 'color-mix(in srgb, var(--color-info) 4%, var(--color-surface))' }}

// 8% tint for badges, chips, subtle fills
style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' }}

// 10% tint for icon containers, stronger emphasis
style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)' }}
```

**Tailwind opacity syntax** for borders/rings:
```tsx
// Ring borders at 20-30% opacity
className="ring-1 ring-primary/20"
className="border border-info/20"
```

### Spacing Scale

Use Tailwind defaults. Prefer `gap-*` and `p-*` over margins. Slightly more generous than typical — components should breathe.

| Use | Class |
|-----|-------|
| Component internal padding (compact) | `px-3 py-2.5` |
| Component internal padding (default) | `px-4 py-3.5` |
| Component internal padding (spacious) | `px-5 py-4` |
| Card padding | `p-5` or `p-6` |
| Section gaps | `gap-3` or `gap-4` |
| Form field spacing | `gap-1.5` (label to input) |
| Inter-component spacing in stories | `gap-3` to `gap-4` |

### Border Radius

| Element | Class | px |
|---------|-------|----|
| Alerts, panels, containers | `rounded-2xl` | 16 |
| Cards, modals | `rounded-xl` | 12 |
| Buttons, inputs, chips | `rounded-lg` | 8 |
| Icon containers, small pills | `rounded-lg` or `rounded-md` | 8/6 |
| Badges, tags | `rounded-full` | pill |
| Avatars, dots | `rounded-full` | circle |
| Bottom sheets (top edge) | `rounded-t-2xl` | 16 |

### Shadow System

Two-layer directional shadows. Light source top-left. Never a single heavy shadow.

```tsx
// Resting (alerts, cards)
shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]

// Raised (dropdowns, floating panels)
shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.06)]

// High elevation (modals, command palette)
shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_24px_48px_-12px_rgba(0,0,0,0.08)]

// Brand glow (primary CTA focus/hover)
shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]

// Color halo (status dots, notification badges)
shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-{x})_20%,transparent)]

// Bottom sheet lift
shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.15)]

// Inset highlight (solid buttons, filled badges)
shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
```

### Animation & Easing

Three named curves defined as CSS custom properties in `@theme`:

```
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1)   → bouncy reveals, dismiss, scale
--ease-smooth:   cubic-bezier(0.25, 0.1, 0.25, 1)     → fades, color transitions
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)        → slide-in panels, drawers
```

Usage:
```tsx
// Snappy interactions (hover, toggle, color change)
transition-all duration-150 ease-[var(--ease-smooth)]

// Spring animations (enter, dismiss, scale)
transition-all duration-200 ease-[var(--ease-spring)]

// Panel slides (drawer, bottom sheet, modal)
transition-transform duration-300 ease-[var(--ease-out-expo)]
```

Dismiss pattern — slide + fade + scale simultaneously:
```tsx
dismissed && 'opacity-0 scale-[0.97] translate-y-1'
```

Honor `prefers-reduced-motion`:
```tsx
className="transition-all duration-200 motion-reduce:transition-none"
```

### Interactive States

Every interactive element must have all states styled distinctly:

| State | Pattern |
|-------|---------|
| Default | Base styles |
| Hover | Tonal bg shift: `hover:bg-surface-lighter`. Or subtle lift: `hover:-translate-y-px` |
| Active/Pressed | Scale down: `active:scale-95` (badges/pills) or `active:scale-[0.98]` (buttons/cards) |
| Focus | Ring with offset: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1` |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none` |

### Vibrancy & Glass (overlays only)

Apple-style translucent surfaces for overlays, nav bars, command palettes:
```css
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
```

### Reference Components

Study `Alert.tsx` and `Badge.tsx` for the canonical implementation of these patterns before building new components. They demonstrate: tonal surfaces, icon containers with rings, inset highlights, spring dismiss, color halos on dots, and ring-based borders.

---

## Component Architecture Patterns

### Compound Component Pattern (preferred for complex components)

```typescript
const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error('Must be used inside <Select>');
  return ctx;
}

const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Content: SelectContent,
  Option: SelectOption,
  Group: SelectGroup,
});
```

### Controlled + Uncontrolled (always support both)

```typescript
function useControllable<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : internal;
  const setValue = (next: T) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };
  return [value, setValue];
}
```

### Polymorphic `as` prop (for base primitives)

```typescript
type PolymorphicProps<T extends React.ElementType> = {
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as'>;

function Box<T extends React.ElementType = 'div'>({
  as,
  ...props
}: PolymorphicProps<T>) {
  const Component = as ?? 'div';
  return <Component {...props} />;
}
```

---

## Component-Specific Rules

### Select / Dropdown / Combobox

- Desktop: custom dropdown panel, positioned with `popover` API or `position: absolute`
- Mobile (`useIsMobile()`): render as `BottomSheet` instead
- Always support: keyboard navigation (Arrow keys, Home, End, typing to filter), `aria-listbox` + `aria-option`
- Multi-select: chips in trigger, checkbox per option

### Modal / Dialog

- Use native `<dialog>` element with `dialog.showModal()` for proper stacking context + backdrop
- Desktop: centered, max-w-md to max-w-2xl depending on content
- Mobile: full-screen with slide-up animation (`translate-y-0` from `translate-y-full`)
- Close: Escape key, backdrop click (configurable `closeOnBackdrop`), explicit close button
- Focus: trap inside, restore to trigger on close

```typescript
const dialogRef = useRef<HTMLDialogElement>(null);
useEffect(() => {
  if (open) dialogRef.current?.showModal();
  else dialogRef.current?.close();
}, [open]);

return (
  <dialog
    ref={dialogRef}
    onClose={() => onOpenChange(false)}
    onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    className="m-auto w-full max-w-md rounded-2xl bg-surface p-6
      backdrop:bg-black/50 backdrop:backdrop-blur-sm
      open:animate-in open:fade-in open:zoom-in-95
      sm:max-w-lg"
  >
    {children}
  </dialog>
);
```

### Drawer

- Desktop: slides from edge (right default), fixed width (320–480px)
- Mobile: full-width bottom sheet with swipe-to-dismiss
- Use `inert` pattern on background content

### Tooltip

- Desktop: hover-triggered, arrow pointer, 300ms delay open / 100ms close
- Mobile: **do not render tooltips**. Info must be surfaced another way
- Use `popover` API with CSS anchoring when available

### Toast / Notification

- Position: top-right desktop, top-center mobile (full-width on small screens)
- Stack multiple toasts with gap
- Auto-dismiss (default 4s), pausable on hover
- Swipe-to-dismiss on mobile (pointer events)

### Table

- Desktop: full table layout
- Mobile: transform rows to card layout or horizontal scroll with sticky first column

### Tabs

- Desktop: horizontal tab bar
- Mobile: scrollable horizontal tabs (no truncation), or convert to select/segmented control

---

## Storybook Story Format (CSF3)

### Story File Template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Primary interactive element. Supports solid, outline, ghost, and destructive variants.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['solid', 'outline', 'ghost', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Button',
    variant: 'solid',
    size: 'md',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex gap-3 flex-wrap items-center">
      <Button variant="solid">Solid</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-3 items-center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  args: { variant: 'outline' },
};
```

### Story Categories

| Category | Title prefix | Components |
|----------|-------------|------------|
| Primitives | `UI/` | Button, Badge, Avatar, Icon, Separator |
| Forms | `Forms/` | Input, Select, Checkbox, Switch, Slider |
| Overlays | `Overlays/` | Modal, Drawer, Popover, Tooltip, Toast |
| Navigation | `Navigation/` | Tabs, Accordion, Breadcrumbs, Pagination |
| Feedback | `Feedback/` | Alert, Skeleton, Progress, Spinner, EmptyState |
| Data | `Data/` | Table, StatCard, Timeline, Feed |
| Layout | `Layout/` | Card, SectionCard, PageHeader, AppShell |

### Required Story Variants (minimum)

- `Default` — args-driven playground
- `Variants` — all visual variants in one view
- `Sizes` — all sizes if component has them
- `Loading` / `Disabled` / `Error` — state stories
- `Mobile` — viewport set to `mobile1` (375px)
- `OnDark` — dark background
- `Interactive` — `play` function with user-event testing
- `WithContent` — realistic content, not lorem ipsum
- `Composition` — component used with other components in realistic context

### Interactive Story with `play`

```typescript
import { userEvent, within, expect } from '@storybook/test';

export const KeyboardNav: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Open' });
    await userEvent.click(trigger);
    await expect(canvas.getByRole('listbox')).toBeVisible();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
  },
};
```

### Storybook URL Patterns

```
# title: 'UI/Button', story: 'Variants'
http://localhost:6006/?path=/story/ui-button--variants

# title: 'Forms/Select', story: 'Default'
http://localhost:6006/?path=/story/forms-select--default

# title: 'Overlays/Modal', story: 'Mobile'
http://localhost:6006/?path=/story/overlays-modal--mobile
```

---

## Unit Testing

### Stack

- **Vitest** — test runner
- **@testing-library/react** — render + query
- **@testing-library/user-event** — realistic interactions
- **@testing-library/jest-dom** — DOM matchers

### What to Test

Test the contract (props in → DOM/behavior out), not internals.

**Always test:**
1. Renders without crashing
2. Each variant renders correct accessible role/label
3. Controlled value updates on interaction
4. Uncontrolled default value works
5. `disabled` prop prevents interaction
6. `loading` prop shows loading state and blocks interaction
7. Keyboard navigation (Arrow, Enter, Space, Escape, Tab)
8. ARIA states reflect component state
9. `onX` callbacks fire with correct arguments
10. Focus management (modal: traps focus; drawer: restores on close)

### Test Template

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

describe('Select', () => {
  it('renders trigger with placeholder', () => {
    render(<Select options={options} placeholder="Pick one" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick one');
  });

  it('opens option list on click', async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeVisible();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('selects option on click and calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={options} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('navigates options with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<Select options={options} disabled />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('works controlled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Select options={options} value="a" onChange={onChange} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Apple');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('combobox')).toHaveTextContent('Apple');
    rerender(<Select options={options} value="b" onChange={onChange} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
  });
});
```

### Modal / Drawer / Overlay Tests

```typescript
describe('Modal', () => {
  it('traps focus inside when open', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        <Modal open onOpenChange={vi.fn()}>
          <button>First</button>
          <button>Second</button>
        </Modal>
      </>
    );
    await user.tab();
    expect(screen.getByText('First')).toHaveFocus();
    await user.tab();
    expect(screen.getByText('Second')).toHaveFocus();
    await user.tab();
    expect(screen.getByText('First')).toHaveFocus();
  });

  it('calls onOpenChange(false) on Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Modal open onOpenChange={onOpenChange}><p>Content</p></Modal>);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

### What NOT to Test

```typescript
// ❌ Internal state
expect(component.state.isOpen).toBe(true);
// ❌ Class names
expect(el).toHaveClass('bg-primary');
// ❌ Snapshots
expect(container).toMatchSnapshot();
// ❌ Implementation details
expect(wrapper.find('SelectContent').prop('visible')).toBe(true);
```

---

## Performance

### Rendering Rules

- Memoize expensive computations, not everything
- Stable callback references via `useCallback`
- No anonymous objects/arrays in JSX
- `React.memo` on leaf list-item components
- CSS animations only (no JS frame loops)
- `content-visibility: auto` for 100–500 item lists
- Windowed rendering for 500+ items
- Tree-shakeable named exports only

---

## What NOT to Do

```tsx
// ❌ Hardcoded color
<div className="bg-indigo-600 text-white" />
// ❌ External dep for animation
import { motion } from 'framer-motion';
// ❌ External dep for floating UI
import { useFloating } from '@floating-ui/react';
// ❌ External dep for focus trap
import FocusTrap from 'focus-trap-react';
// ❌ Tooltip that shows on mobile
// ❌ Centered modal on mobile
// ❌ Component with no keyboard nav
// ❌ No story file
```

---

# PART 3: PLAYWRIGHT MCP TESTING PIPELINE

After building component + stories, verify EVERYTHING with Playwright MCP. Not spot-checking — thorough.

## Ensure Storybook Running

```bash
curl -s http://localhost:6006 > /dev/null || (cd packages/ui && npx storybook dev -p 6006 --no-open &)
```

## For Each Story Variant

1. **Navigate**: `mcp__playwright__browser_navigate` → story URL
2. **Snapshot**: `mcp__playwright__browser_snapshot` — verify accessibility tree
3. **Screenshot**: `mcp__playwright__browser_take_screenshot` — capture visual state
4. **Keyboard nav**:
   - `mcp__playwright__browser_press_key` → Tab, Enter, Space, Escape, ArrowDown, ArrowUp
   - Verify focus movement via snapshot after each key
5. **Mouse interaction**:
   - `mcp__playwright__browser_click` on interactive elements
   - `mcp__playwright__browser_hover` on hover-responsive elements
   - Verify state changes via snapshot
6. **Console errors**: `mcp__playwright__browser_console_messages` — ZERO errors allowed
7. **Responsive**:
   - `mcp__playwright__browser_resize` → 375×812 (mobile)
   - Screenshot + snapshot mobile view
   - `mcp__playwright__browser_resize` → 1280×800 (desktop)

## Full Test Matrix (run ALL for each component)

| Test | What to verify |
|------|----------------|
| Renders | Component visible, no console errors |
| All variants | Each variant visually distinct |
| All sizes | Size hierarchy proportional |
| Hover state | Visual feedback via `browser_hover` |
| Focus state | Ring/outline visible on keyboard focus |
| Disabled state | Reduced opacity, no interaction |
| Loading state | Loading indicator, interaction blocked |
| Keyboard nav | Tab order, Enter/Space activate, Escape dismisses |
| ARIA | Correct roles, states, labels in a11y snapshot |
| Mobile | Bottom sheet for dropdowns, full-screen for modals, touch targets ≥44px |
| Dark bg | Readable, proper contrast |
| Composition | Works alongside other components |
| Content overflow | Long text, many items, empty state |
| Animation | Smooth transitions, reduced-motion respected |

---

# PART 4: DESIGNER-GRADE VISUAL ANALYSIS

**THE MOST IMPORTANT PART.** Take screenshots. Analyze like a world-class product designer. Mediocre is not acceptable.

## Visual Design Scorecard

Rate 1–10 for each criterion. Be brutally honest.

| Criterion | What to evaluate |
|-----------|-----------------|
| **Hierarchy** | Visual weight distribution correct? Primary action dominates, secondary recedes? Eye follows intended path? |
| **Spacing** | Whitespace consistent? Component breathes? Related elements grouped tightly, unrelated separated? Optical alignment? |
| **Typography** | Font sizes, weights, line-heights create clear hierarchy? Text legible at all sizes? Letter-spacing appropriate? |
| **Color** | Design tokens used correctly? Contrast ratios sufficient (4.5:1 text, 3:1 UI)? Colors convey meaning? No jarring combos? |
| **Depth & Shadow** | Shadows create believable depth? Elevation matches importance? No flat/lifeless but no excessive shadow? |
| **Border & Radius** | Consistent with design system scale? Inner radius = outer − padding? Borders subtle enough to structure without dominating? |
| **Interactive Feedback** | Hover/focus/active feel responsive and physical? Transitions smooth with appropriate easing? Scale/color shifts proportional? |
| **Mobile Feel** | Touch targets adequate? Bottom sheet slides naturally? Swipe feels native? No horizontal scroll? |
| **Polish** | Pixel-perfect alignment? No orphaned text, awkward wrapping, misaligned icons? Loading states feel intentional? |
| **Delight** | Does it feel premium? Would you show this to a design-aware CEO? Is there any moment of "that's nice"? |

**Minimum passing score: 8/10 average across all criteria.**

Any criterion below 7 OR average below 8 → iterate:
1. Document specific issues
2. Fix implementation
3. Re-screenshot, re-evaluate
4. Max 3 design iterations per component

## Common Design Issues to Catch

- **Flat** — no shadow, no border, no depth cues → wireframe feel
- **Noisy** — too many borders, shadows, colors competing
- **Cramped** — not enough padding, text touching edges
- **Disconnected** — related elements not visually grouped
- **Inconsistent** — mixed radii, spacing values, font sizes
- **Inaccessible** — low contrast, tiny touch targets, no focus indicator
- **Janky** — stuttering transitions, layout shifts during interaction
- **Generic** — looks like every other component library, no personality
- **Orphaned states** — empty state blank, error state afterthought

---

# PART 5: COMPLETION CHECKLIST

**Files**
- [ ] `packages/ui/src/components/<Name>/<Name>.tsx`
- [ ] `packages/ui/src/components/<Name>/<Name>.test.tsx`
- [ ] `packages/ui/src/components/<Name>/<Name>.stories.tsx`
- [ ] `packages/ui/src/components/<Name>/index.ts`
- [ ] Added to `packages/ui/src/index.ts`

**Scope**
- [ ] Zero domain coupling

**Styling**
- [ ] Zero hardcoded colors
- [ ] Zero new npm deps

**TypeScript**
- [ ] No `any`, proper generics, `forwardRef`

**Mobile**
- [ ] `useIsMobile()` platform-aware behavior
- [ ] Dropdowns → bottom sheet on mobile
- [ ] Modals → full-screen on mobile

**Accessibility**
- [ ] Correct ARIA roles, states, properties
- [ ] Full keyboard nav
- [ ] Focus trap/restore for overlays
- [ ] `prefers-reduced-motion`

**Tests** — `pnpm test packages/ui`
- [ ] All variants render
- [ ] Controlled + uncontrolled
- [ ] `disabled` blocks interaction
- [ ] Keyboard nav with `userEvent`
- [ ] ARIA states match component state
- [ ] Callbacks fire correctly
- [ ] Focus trap/restore for overlays

**Storybook**
- [ ] Default, Variants, Sizes stories
- [ ] Loading, Disabled, Error stories
- [ ] Mobile story with viewport
- [ ] OnDark story
- [ ] Interactive `play` story
- [ ] WithContent (realistic data)
- [ ] Composition story

**Visual Verification (Playwright MCP)**
- [ ] All stories screenshotted and analyzed
- [ ] Design score ≥ 8/10 average
- [ ] Zero console errors
- [ ] Mobile view verified
- [ ] Dark background verified
- [ ] Keyboard nav verified in browser
- [ ] ARIA tree verified via snapshot
